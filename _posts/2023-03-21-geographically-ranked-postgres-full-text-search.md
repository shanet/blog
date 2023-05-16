---
layout: post
title: Geographically ranked Postgres full text search
date: 2023-03-21
---

Here's a problem: You have 20,000 records each with latitude and longitude coordinates. You want a search function for these records to show the results closest to the user's current position on a map. What do you do?

Thanks to Postgres' full text search and Earthdistance extension we can implement this logic entirely in the database and it's lightning fast to boot.

This is exactly the problem I had when I was working on my recent project [Pirep](https://pirep.io). The core functionality of the website is based around a map which displays ~20,000 airports in the US provided by the FAA's database. The map has a search feature on it and I wanted it to display results based on the area the user was looking at on the map. For example, searching for `Portland` when looking at New England would return the Portland, Maine airport rather than the Portland, Oregon airport even though Oregon would likely be the more common result given it's a larger city.

As far as searching goes, given a database with all of the airports in it, indexing by airport name and location isn't difficult. The difficulty comes in when trying to rank search results based on the proximity to the user's current location. It's not exactly feasible to read every record, calculate its distance to the user, sort by distance, and then take your search results in realtime. You could conceivably index airports by their state and only return results from the same state as the user then calculate distance on those results and sort by that. That may be a "good enough" solution, but in my case I wanted, for example, a search for `port` when looking at the south Puget Sound to return Port Orchard, WA at the top of the list instead of the further away Port Angeles, WA. Thanks to the Earthdistance extension it's possible to do this type of calculation entirely in the database and in realtime.

<!--more-->

## Searches Schema

First though, let's cover the basics of Postgres' full text search in general and how we can use it to index our records and then search and rank them based on our application's needs. To start off, all of my search records are stored in a `searches` table with the following schema:

{% highlight sql linenos %}
searches_demo=# \d searches;
                                        Table "public.searches"
     Column      |          Type          | Collation | Nullable |               Default                
-----------------+------------------------+-----------+----------+--------------------------------------
 id              | integer                |           | not null | nextval('searches_id_seq'::regclass)
 searchable_type | character varying(255) |           | not null |
 searchable_id   | integer                |           | not null |
 term_vector     | tsvector               |           | not null |
 term            | character varying(255) |           | not null |

Indexes:
    "searches_pkey" PRIMARY KEY, btree (id)
    "searches_searchable_id_searchable_type_term_idx" UNIQUE, btree (searchable_id, searchable_type, term)
    "searches_searchable_type_searchable_id_idx" btree (searchable_id, searchable_type, term)
    "searches_term_vector_idx" gin (term_vector)
{% endhighlight %}

This table's schema is fairly simple with the following columns:

* `id`: Primary key
* `searchable_type`: The record type that this search record corresponds to.
* `searchable_id`: The record ID that this search record corresponds to.
* `term_vector`: The compiled search term that Postgres will use for matching against a user inputted query.
  * The `tsvector` type is a Postgres type that stores this information and will be used heavily here for search indexing and conducting searches.
* `term`: The raw search term that will match this search record as a search result.

For indicies a GIN index exists for the term vector for quick searching. Additionally, a unique index on searchable ID, searchable type, and the search term exists for doing upsert statements when indexing records.

## Indexing

Speaking of search indexing, let's go into how to populate this table. All of this functionality is used inside of a Rails app so we could do something simple like iterate over all of our records and upsert a search record for each of them. This isn't very performant though; we could instead do all of the indexing directly in the database nearly instantaneously with an `INSERT INTO SELECT` statement.

Let's consider we have an `airports` table which contains some basic information about airports:

{% highlight sql linenos %}
searches_demo=# \d airports;
                                    Table "public.airports"
 Column |          Type          | Collation | Nullable |               Default                
--------+------------------------+-----------+----------+--------------------------------------
 id     | integer                |           | not null | nextval('airports_id_seq'::regclass)
 code   | character varying(255) |           |          | 
 name   | character varying(255) |           |          |

Indexes:
    "airports_pkey" PRIMARY KEY, btree (id)
    "airports_code_key" UNIQUE CONSTRAINT, btree (code)
{% endhighlight %}

We'll populate it with a few records:

{% highlight sql linenos %}
searches_demo=# SELECT * FROM airports;
 id | code |                    name                     
----+------+---------------------------------------------
  1 | SEA  | Seattle-Tacoma International
  2 | SFO  | San Francisco International
  3 | BLI  | Bellingham International Airport
  4 | ANC  | Ted Stevens Anchorage International Airport
{% endhighlight %}

With that all set up, if we want to create search records for every airport indexing by its name all we need is one query as such:

{% highlight sql linenos %}
INSERT INTO searches (
  searchable_id,
  searchable_type,
  term_vector,
  term
)
SELECT
  id,
  'Airport',
  to_tsvector('simple', name),
  name
FROM airports
WHERE name IS NOT NULL AND name != '';
{% endhighlight %}

Alright, so what's going on here? Essentially we're taking every airport record and creating a new search record for it with its ID set to `searchable_id`, `searchable_type` set to `Airport`, and the search term set to the airport name for airports where it's not null or an empty string.

The important part is the `to_tsvector('simple', name)` line. This tells Postgres to convert the airport's name to a [`tsvector` value](https://www.postgresql.org/docs/current/datatype-textsearch.html). This is a sorted list of unique lexemes or tokens which are normalized to represent variants of the words in the input. Basically, it's a special data structure that indexes our search terms so that when we search for them later Postgres can do its magic to return search results for us.

To demonstrate, we can see below how Postgres will transform a given sentence into a `tsvector`:

{% highlight sql linenos %}
# select to_tsvector('simple', 'The quick brown fox jumps over the lazy dog');
                                to_tsvector                                
---------------------------------------------------------------------------
 'brown':3 'dog':9 'fox':4 'jumps':5 'lazy':8 'over':6 'quick':2 'the':1,7
{% endhighlight %}

It's worth pointing out the first argument to this function. Above it's set to `simple` which tells Postgres to not perform any mangling of the input. Instead if we set it to `english` when Postgres will perform some manipulation on the input to adapt for language-specific features for yielding hopefully better search results. Notably, the lexeme `the` is omitted entirely from the `tsvector` below since it would not yield relevant search results in most cases.

{% highlight sql linenos %}
# select to_tsvector('english', 'The quick brown fox jumps over the lazy dog');
                      to_tsvector                      
-------------------------------------------------------
 'brown':3 'dog':9 'fox':4 'jump':5 'lazi':8 'quick':2
{% endhighlight %}

Depending on your use case you may not want Postgres to manipulate your input and instead index it as-is. This airport name case is one of those situations. Here we have all proper nouns that Postgres should not be changing. If your search terms involve primarily unique values you'd probably want to use `simple` as well but if you're searching more free-form documents then `english` (or whatever language the content is in) would be appropriate.

Additionally, there are many more options for controlling how Postgres parses your search terms. The [Postgres manual has excellent documentation](https://www.postgresql.org/docs/current/textsearch-controls.html) on how to use these.

Getting back to our query, if we run it with the following records in our airports table we get the search table populated as such:

{% highlight sql linenos %}
searches_demo=# SELECT * FROM searches;
 id | searchable_type | searchable_id |                           term_vector                           |                    term                     
----+-----------------+---------------+-----------------------------------------------------------------+---------------------------------------------
  5 | Airport         |             1 | 'international':4 'seattle':2 'seattle-tacoma':1 'tacoma':3     | Seattle-Tacoma International
  6 | Airport         |             2 | 'francisco':2 'international':3 'san':1                         | San Francisco International
  7 | Airport         |             3 | 'airport':3 'bellingham':1 'international':2                    | Bellingham International Airport
  8 | Airport         |             4 | 'airport':5 'anchorage':3 'international':4 'stevens':2 'ted':1 | Ted Stevens Anchorage International Airport
{% endhighlight %}

## Searching

With a populated search table we can finally start running some searches. This is as easy as a select statement:

{% highlight sql linenos %}
searches_demo=# SELECT airports.* FROM "airports"
INNER JOIN searches ON searches.searchable_id = airports.id
WHERE (term_vector @@ to_tsquery('simple', 'seattle'));

 id | code |             name             
----+------+------------------------------
  1 | SEA  | Seattle-Tacoma International
{% endhighlight %}

Let's break this down a little bit. Everything here is a basic select statement with a join and a where clause. The key components are the `@@` operator and the `to_tsquery` function. Here we're taking our search query, `seattle`, converting it to a `tsquery` and then using the `@@` operator to tell Postgres to check if there's a match between the `tsquery` value and the `tsvector` values in our search table. The matching rows become our search results so we pull the associated records from the airports table with the join.

Similar to the `to_tsvector` function, there's a bunch of additional functionality here. First and foremost, the language argument behaves the same way. In fact, it should match the language the `tsvector` values were created with or we may not get any results. For example the same query with the language set to `english` will find nothing:

{% highlight sql linenos %}
searches_demo=# SELECT airports.* FROM "airports"
INNER JOIN searches ON searches.searchable_id = airports.id
WHERE (term_vector @@ to_tsquery('english', 'seattle'));

 id | code | name 
----+------+------
(0 rows)
{% endhighlight %}

Depending on your use case, you may want to specify prefix matching for your queries. Consider the following case where if we search for just `inter` we get no results:

{% highlight sql linenos %}
searches_demo=# SELECT airports.* FROM "airports"
INNER JOIN searches ON searches.searchable_id = airports.id
WHERE (term_vector @@ to_tsquery('simple', 'inter'));

 id | code | name 
----+------+------
(0 rows)

{% endhighlight %}

But by changing the query to `inter:*` hence telling Postgres to treat the query as a prefix search we get what would probably be a more expected result:

{% highlight sql linenos %}
searches_demo=# SELECT airports.* FROM "airports"
INNER JOIN searches ON searches.searchable_id = airports.id
WHERE (term_vector @@ to_tsquery('simple', 'inter:*'));

 id | code |                    name                     
----+------+---------------------------------------------
  1 | SEA  | Seattle-Tacoma International
  2 | SFO  | San Francisco International
  3 | BLI  | Bellingham International Airport
  4 | ANC  | Ted Stevens Anchorage International Airport
{% endhighlight %}

In addition to `to_tsquery`, there are [a handful of other conversion functions worth reading about](https://www.postgresql.org/docs/current/textsearch-controls.html) that may be useful depending on your use case. For example, `plainto_tsquery`, `phraseto_tsquery`, and `websearch_to_tsquery`.

## Ranking Results

The above queries are simply returning whichever search records matched search terms with the given query; there's no specified ranking or ordering of search results. If the ultimate goal is to have our search results be in order of what is closest to the user we'll need a way to rank them. This is where the `setweight` and `ts_rank` functions come into play.

In order to get ranked search results we first need to specify what weighting of search records should be. This will depend on the business logic needs of your application but for this case let's say we want to weight public airports higher than private airports. We'll add a new `facility_use` column to the airports table to denote this with either `public` or `private` strings values.

{% highlight sql linenos %}
searches_demo=# SELECT * FROM airports;

 id | code |                    name                     | facility_use 
----+------+---------------------------------------------+--------------
  5 | SEA  | Seattle-Tacoma International                | public
  6 | SFO  | San Francisco International                 | private
  7 | ANC  | Ted Stevens Anchorage International Airport | public
  8 | BLI  | Bellingham International Airport            | private
{% endhighlight %}

Now we can use this new column when creating search records to apply weighting to the `tsvector` values. First though we need to understand how Postgres weighs `tsvector` values. It's fairly simple actually: Postgres uses the letters A, B, C, and D for weights. The intention behind this is that different parts of a text document carry more weight than others. For example, the title would have weight `A` and the body have weight `D`. However, note that the numerical values derived from these weights that will order results are **not** tied to these letters. For example, it would be natural to assume that a weight of `A` would correspond to the highest priority, but that's not necessarily true depending on how your structure your search query. In fact, as you'll see below, Postgres' default is that `D` is the highest weighted value. Think of the letters more as a categorization method rather than strictly a weighting method. For one type of search query you may want lexemes with weight `A` to be the most relevant and another weight `B` should be at the top. More on this below.

In our example here, we'll give public airports a weight of `D` and private a weight of `C` since the more common airports will generally be the public ones (again, because by default Postgres will make `D` the most relevant results). To do this we'll modify the `INSERT` statement above that creates the search records to include the weighting with the `setweight` function.

{% highlight sql linenos %}
INSERT INTO searches (
  searchable_id,
  searchable_type,
  term_vector,
  term
)
SELECT
  id,
  'Airport',
  CASE WHEN facility_use = 'public' THEN setweight(to_tsvector('simple', name), 'D') ELSE setweight(to_tsvector('simple', name), 'C') END,
  name
FROM airports
WHERE name IS NOT NULL AND name != '';
{% endhighlight %}

The key modification being the conditional statement where the `to_tsvector` calls are wrapped with `setweight` calls with the relevant `D` or `C` arguments. Now after viewing the search records we can see how lexemes in the `tsvector` values have weights associated with them:

{% highlight sql linenos %}
searches_demo=# SELECT * FROM searches;

 id | searchable_type | searchable_id |                             term_vector                         |                    term                     
----+-----------------+---------------+-----------------------------------------------------------------+---------------------------------------------
 13 | Airport         |             5 | 'international':4 'seattle':2 'seattle-tacoma':1 'tacoma':3     | Seattle-Tacoma International
 14 | Airport         |             6 | 'francisco':2C 'international':3C 'san':1C                      | San Francisco International
 15 | Airport         |             7 | 'airport':5 'anchorage':3 'international':4 'stevens':2 'ted':1 | Ted Stevens Anchorage International Airport
 16 | Airport         |             8 | 'airport':3C 'bellingham':1C 'international':2C                 | Bellingham International Airport
{% endhighlight %}

Now we can perform weighted searches against these terms. As mentioned above, the letters themselves don't assume that `D` is always the most relevant. When doing a search query we need to apply the `ts_rank` function to assign numerical values to each letter. By default, Postgres will apply the following weights to the values `D` through `A` respectively: `{0.1, 0.2, 0.4, 1.0}`.

This will control which values carry the most weight and subsequently the most relevant results. It is possible to assign your own custom values too for changing this behavior on the fly. The `tsrank` function takes an optional argument that let's you specify your own weight values.

As with most things here, Postgres provides a bunch of configurability to ranking. It's worth giving [the documentation](https://www.postgresql.org/docs/current/textsearch-controls.html#TEXTSEARCH-RANKING) a read through.

With all that in mind, our new search query for the word "international" will look as such:

{% highlight sql linenos %}
searches_demo=# SELECT airports.*, ts_rank(term_vector, 'international') AS rank FROM airports
INNER JOIN searches ON searches.searchable_id = airports.id
WHERE (term_vector @@ to_tsquery('simple', 'international')) ORDER BY rank ASC;

 id | code |                    name                     | facility_use |    rank    
----+------+---------------------------------------------+--------------+------------
  5 | SEA  | Seattle-Tacoma International                | public       | 0.06079271
  7 | ANC  | Ted Stevens Anchorage International Airport | public       | 0.06079271
  6 | SFO  | San Francisco International                 | private      | 0.12158542
  8 | BLI  | Bellingham International Airport            | private      | 0.12158542
{% endhighlight %}

Breaking this down, the search query is nearly the same as before with two notable changes:

1. The addition of the calculated `rank` column with `ts_rank(, term_vector, 'international') AS rank`.
1. The `ORDER BY rank ASC` clause to sort by the calculated rank.

As we'd hope for, this places the public airports above the private ones.

## Ranking by Distance

All of the above was building up to the point where we start mixing in the [Earthdistance extension](https://www.postgresql.org/docs/current/earthdistance.html). Earthdistance is a Postgres extension that allows us to compute great circle distances between coordinate points directly in the database. We can use it in combination with the full text search concepts above to create location-aware search queries. Before using it, it must first be enabled with:

{% highlight sql linenos %}
CREATE EXTENSION earthdistance CASCADE;
{% endhighlight %}

The first task we need to accomplish is adding latitude and longitude location data to the airports. Since we'll be operating on these values in the database we need to use the correct data type; a `point` type in this case. Let's make new airports and searches tables with a `coordinates` column of type `point` and insert airports into the table:

{% highlight sql linenos %}
CREATE TABLE airports (
  id SERIAL PRIMARY KEY,
  code VARCHAR(255) UNIQUE,
  name VARCHAR(255),
  coordinates POINT
);

CREATE TABLE searches (
  id SERIAL PRIMARY KEY,
  searchable_type VARCHAR(255) NOT NULL,
  searchable_id INTEGER NOT NULL,
  term_vector TSVECTOR NOT NULL,
  term VARCHAR(255) NOT NULL,
  coordinates POINT
);

INSERT INTO airports (code, name, coordinates) VALUES ('SEA', 'Seattle-Tacoma International', point(47.44988888, -122.31177777));
INSERT INTO airports (code, name, coordinates) VALUES ('SFO', 'San Francisco International', point(37.61880555, -122.37541666));
INSERT INTO airports (code, name, coordinates) VALUES ('ANC', 'Ted Stevens Anchorage International Airport', point(61.17408472, -149.9981375));
INSERT INTO airports (code, name, coordinates) VALUES ('BLI', 'Bellingham International Airport', point(48.79269444, -122.53752777));

SELECT * FROM airports;
 id | code |                    name                     |         coordinates         
----+------+---------------------------------------------+-----------------------------
  1 | SEA  | Seattle-Tacoma International                | (47.44988888,-122.31177777)
  2 | SFO  | San Francisco International                 | (37.61880555,-122.37541666)
  3 | ANC  | Ted Stevens Anchorage International Airport | (61.17408472,-149.9981375)
  4 | BLI  | Bellingham International Airport            | (48.79269444,-122.53752777)

INSERT INTO searches (
  searchable_id,
  searchable_type,
  term_vector,
  term,
  coordinates
)
SELECT
  id,
  'Airport',
  to_tsvector('simple', name),
  name,
  coordinates
FROM airports
WHERE name IS NOT NULL AND name != '';

SELECT * FROM searches;
 id | searchable_type | searchable_id |                           term_vector                           |                    term                     |         coordinates         
----+-----------------+---------------+-----------------------------------------------------------------+---------------------------------------------+-----------------------------
  1 | Airport         |             1 | 'international':4 'seattle':2 'seattle-tacoma':1 'tacoma':3     | Seattle-Tacoma International                | (47.44988888,-122.31177777)
  2 | Airport         |             2 | 'francisco':2 'international':3 'san':1                         | San Francisco International                 | (37.61880555,-122.37541666)
  3 | Airport         |             3 | 'airport':5 'anchorage':3 'international':4 'stevens':2 'ted':1 | Ted Stevens Anchorage International Airport | (61.17408472,-149.9981375)
  4 | Airport         |             4 | 'airport':3 'bellingham':1 'international':2                    | Bellingham International Airport            | (48.79269444,-122.53752777)
{% endhighlight %}

*Note that the `facility_use` column was dropped since we're not using it anymore.*

The above should get our database set up. For the fun part, we can now write our search query. Essentially the method boils down to taking the computed rank and further weighting it by distance. This is done by multiplying the rank value by the distance between the user's given location and the airport's location.

Because we're using `point`s the complex part of computing this distance becomes as simple as using the `<@>` operator. This will compute the distance between two points. It assumes that the Earth is a perfect sphere which of course isn't true, but should be accurate enough for most purposes.

Finally, putting this all together we end up with the following search query (which is looking for airports closest to Anchorage):

{% highlight sql linenos %}
searches_demo=# SELECT airports.*, ts_rank(term_vector, 'international') * (point(60.962834, -149.069051) <@> searches.coordinates) AS rank FROM airports
INNER JOIN searches ON searches.searchable_id = airports.id
WHERE (term_vector @@ to_tsquery('simple', 'international')) ORDER BY rank ASC;

 id | code |                    name                     |         coordinates         |        rank        
----+------+---------------------------------------------+-----------------------------+--------------------
  3 | ANC  | Ted Stevens Anchorage International Airport | (61.17408472,-149.9981375)  | 3.9767341404856635
  4 | BLI  | Bellingham International Airport            | (48.79269444,-122.53752777) | 116.90464166997339
  1 | SEA  | Seattle-Tacoma International                | (47.44988888,-122.31177777) | 118.99627871014933
  2 | SFO  | San Francisco International                 | (37.61880555,-122.37541666) | 130.83810864901926
{% endhighlight %}

Just like that, we have the search results in order from closest to furthest away. Note that the rank column is proportional in magnitude to the distance from the given location in that the two Washington airports (Seattle and Bellingham) are close in value while San Francisco is still further away. With this, it may be useful to drop off search results entirely based on a rank value if far away results are deemed not relevant.

And of course, this is still a search so if the search term is changed to something that does not match all of the airports, like `seattle`, then only the relevant search results are returned:

{% highlight sql linenos %}
searches_demo=# SELECT airports.*, ts_rank(term_vector, 'seattle') * (point(60.962834, -149.069051) <@> searches.coordinates) AS rank FROM airports
INNER JOIN searches ON searches.searchable_id = airports.id
WHERE (term_vector @@ to_tsquery('simple', 'seattle')) ORDER BY rank ASC;

 id | code |             name             |         coordinates         |        rank        
----+------+------------------------------+-----------------------------+--------------------
  1 | SEA  | Seattle-Tacoma International | (47.44988888,-122.31177777) | 118.99627871014933
{% endhighlight %}

Best of all, these queries are lightning fast. In Pirep, the searches table has ~40,000 rows in it since each airport is indexed by both its code and name. Ranking by distance with that table size is near instantaneous:

{% highlight sql linenos %}
pirep_development=# SELECT count(*) FROM searches;

 count 
-------
 41324

pirep_development=# EXPLAIN ANALYZE SELECT airports.code, ts_rank(term_vector, 'intl:*') * (point(39.82834557323, -98.57944574225633) <@> searches.coordinates) AS rank FROM airports INNER JOIN searches ON searches.searchable_id = airports.id WHERE (term_vector @@ to_tsquery('simple', 'intl:*')) ORDER BY rank ASC;

                                                                         QUERY PLAN                                                                          
-------------------------------------------------------------------------------------------------------------------------------------------------------------
 Sort  (cost=1980.21..1980.94 rows=293 width=12) (actual time=6.216..6.233 rows=273 loops=1)
   Sort Key: ((ts_rank(searches.term_vector, '''intl'':*'::tsquery) * ('(39.82834557323,-98.57944574225633)'::point <@> searches.coordinates)))
   Sort Method: quicksort  Memory: 37kB
   ->  Hash Join  (cost=540.37..1968.20 rows=293 width=12) (actual time=0.463..6.138 rows=273 loops=1)
         Hash Cond: (airports.id = searches.searchable_id)
         ->  Seq Scan on airports  (cost=0.00..1319.47 rows=20647 width=20) (actual time=0.006..3.769 rows=20647 loops=1)
         ->  Hash  (cost=536.70..536.70 rows=294 width=60) (actual time=0.430..0.430 rows=273 loops=1)
               Buckets: 1024  Batches: 1  Memory Usage: 39kB
               ->  Bitmap Heap Scan on searches  (cost=26.28..536.70 rows=294 width=60) (actual time=0.156..0.376 rows=273 loops=1)
                     Recheck Cond: (term_vector @@ '''intl'':*'::tsquery)
                     Heap Blocks: exact=162
                     ->  Bitmap Index Scan on searches_next_term_vector_idx  (cost=0.00..26.20 rows=294 width=0) (actual time=0.139..0.139 rows=274 loops=1)
                           Index Cond: (term_vector @@ '''intl'':*'::tsquery)
 Planning Time: 0.312 ms
 Execution Time: 6.273 ms
{% endhighlight %}

## Rails Integration

That's all for the pure SQL side of things. It's worth briefly covering how to integrate all of this into a web framework. Since Pirep is written in Rails, I cover that here, but the concepts are generally the same for any MVC web framework in terms of configuring models/controllers and reindexing records. Below are snippets of code pulled from Pirep. Some necessary plumbing code is omitted for brevity. Full code listings are linked to at the bottom.

### Indexing

To represent the search data, a `Search` model is created with a standard migration:

{% highlight ruby linenos %}
class AddSearch < ActiveRecord::Migration[7.0]
  def change
    create_table :searches, id: :uuid do |table| # rubocop:disable Rails/CreateTableWithTimestamps
      table.references :searchable, null: false, polymorphic: true, type: :uuid
      table.tsvector :term_vector, null: false
      table.string :term, null: false
      table.point :coordinates

      # Create a gin index for search performance and an index for upsert statements when reindexing individual records
      table.index :term_vector, using: :gin
      table.index [:searchable_id, :searchable_type, :term], unique: true
    end
  end
end
{% endhighlight %}

The `Search` model is a polymorphic relationship to any other record type that is to be made searchable. Even though reindexing is super fast, with enough data it will inevitably begin to slow down. Since it would be a bad idea to be running live search queries against a search table that is also actively being indexed, this process uses a temporary searches table that is then swapped out with the live table as such:

{% highlight ruby linenos %}
def self.reindex!
  search_records = []

  # Collect indexing statements from all searchable models
  SEARCH_MODELS.each do |model|
    search_records << model.search_index
  end

  statements = [
    # Drop and create a new temporary search table by copying the structure of the existing one
    "DROP TABLE IF EXISTS #{TABLE_NEXT}",
    "CREATE TABLE #{TABLE_NEXT} (LIKE #{TABLE_CURRENT} INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES)",

    # Insert the search records for all models (note that `UNION ALL` won't check for duplicates here)
    "INSERT INTO #{TABLE_NEXT} (searchable_id, searchable_type, term_vector, term, coordinates) #{search_records.join("\nUNION ALL\n")}",

    # Replace the current searches table with the new one
    "ALTER TABLE #{TABLE_CURRENT} RENAME TO #{TABLE_LAST}",
    "ALTER TABLE #{TABLE_NEXT} RENAME TO #{TABLE_CURRENT}",
  ]

  transaction do
    statements.each do |statement|
      connection.execute(statement)
    end
  end

  # We don't need the old table anymore
  connection.execute("DROP TABLE IF EXISTS #{TABLE_LAST}")
end
{% endhighlight %}

The method above collects indexing SQL from each model that is made searchable. This is defined in a `Searchable` concern included on the relevant models:

{% highlight ruby linenos %}
module Searchable
  extend ActiveSupport::Concern

  module ClassMethods
    def searchable(term)
      self.search_terms ||= []
      self.search_terms << term
    end

    def search_index
      return self.search_terms.map do |term|
        <<~SQL.squish
          SELECT
            id::uuid,
            '#{name}',
            #{term_to_tsvector(term)},
            '#{term[:column]}',
            #{self == Airport ? 'coordinates' : 'NULL::point'}
          FROM #{table_name}
          WHERE #{term[:column]} IS NOT NULL AND #{term[:column]} != ''
        SQL
      end
    end

    def term_to_tsvector(term)
      # Use "simple" language here to avoid mangaling names since these are all proper nouns and specific terms
      term_vector = "to_tsvector('simple', #{term[:column]})"

      if term[:weight]
        # Allow for conditional weighting
        if term[:weight].is_a? Array
          term_vector = "CASE WHEN #{term[:weight][0]} THEN setweight(#{term_vector}, '#{term[:weight][1]}') ELSE setweight(#{term_vector}, '#{term[:weight][2]}') END"
        else
          term_vector = "setweight(#{term_vector}, '#{term[:weight]}')"
        end
      end

      return term_vector
    end
  end
end
{% endhighlight %}

This allows searchable models to define their search terms by simply calling the `searchable` method:

{% highlight ruby linenos %}
# Rank airport codes above names to prioritize searching by airport code
# Also rank public airports over private airports
searchable({column: :code, weight: ['facility_use = \'PU\'', :A, :B]})
searchable({column: :name, weight: ['facility_use = \'PU\'', :C, :D]})
{% endhighlight %}

The above is having airports indexed by both their unique codes and also names with codes prioritized over names and public airports prioritized over private airports in the results.

This can be changed to any column for the model. For example, a `User` model could easily index by email address with `searchable({column: :email})`.

While it's possible to reindex the entire database whenever something changes (it's fast enough at this scale), it's much more efficient to only reindes the affected records. The `Searchable` model has a function to do this too:

{% highlight ruby linenos %}
after_create :search_reindex!
after_save :search_reindex!, if: :should_reindex?

def should_reindex?
  return search_terms.any? do |term|
    send("saved_change_to_#{term[:column]}?")
  end
end

def search_reindex!
  transaction do
    self.class.search_terms.map do |term|
      statement = <<~SQL.squish
        INSERT INTO searches (
          searchable_id, searchable_type, term_vector, term, coordinates
        )
        SELECT
          id :: uuid,
          '#{self.class.name}',
          #{self.class.term_to_tsvector(term)},
          '#{term[:column]}',
          #{instance_of?(Airport) ? 'coordinates' : 'NULL::point'}
        FROM
          #{self.class.table_name}
        WHERE
          id = '#{id}'
          AND #{term[:column]} IS NOT NULL AND #{term[:column]} != ''
        ON CONFLICT (searchable_id, searchable_type, term) DO UPDATE SET
          term_vector = excluded.term_vector, coordinates = excluded.coordinates
      SQL

      self.class.connection.execute(statement)
    end
  end
end
{% endhighlight %}

Because all of the indexing is done directly in the database it's nearly instantaneous to index tens of thousands of records and incurs none of the usual Rails' overheads.

### Searching

Then to query the data the `Search` model has a `query` method which handles a few tasks for us. First, it normalizes queries by always searching in lowercase since search is otherwise case sensitive. It also truncates absurdly long queries that may make Postgres choke and removes bad characters that are invalid search syntax. The caller can also request a wildcard search for allowing partial word matches.

For the results, the `query` method will consider which models to query. With the exception of a global search, in most cases you want to only search one type of record. In this case, we can return those models directly instead of `Search` records. However, in the case of mixed model results the `Search` records are returned to keep an `ActiveRecord_Relation` object instead of an array. It is the caller's responsibility to use the `Search` records as needed to get the relevant associated records.

In the code below, custom rank values are used since I wanted airport searches by code to always significantly outweigh searches by name.

{% highlight ruby linenos %}
def self.query(query, models=nil, coordinates=nil, wildcard: false)
  # Normalize casing, escape special characters that will cause syntax errors in the query, and truncate queries that are ridiculously long
  query = query.downcase.gsub("'", "''").truncate(100)

  [':', '(', ')', '<', '>'].each do |character|
    query = query.gsub(character, "\\#{character}")
  end

  # Add a suffix wildcard to the query if requested to allow for partial matches on words
  query = query.split.map {|term| wildcard ? "#{term}:*" : term}.join(' & ')

  # Only for airports: Rank the results by proximity to the coordinates if given any. This uses the `<@>` operator to calculate the distance
  # from the airport's coordinates to the given coordinates with Postgres' earthdistance extension. This assumes the Earth is a perfect sphere
  # which is close enough for our purposes here. This distance is then multiplied by the result's rank such that further away airports have a
  # higher rank and thus show lower in the results.
  #
  # Likewise, when doing the ranking we want to prioritize results for airport codes over airport nodes. The weights are set such that the
  # A and B weights will have higher ranking nearly always.
  coordinates_weight = (coordinates ? "* (point(#{coordinates[:latitude]}, #{coordinates[:longitude]}) <@> #{table_name}.coordinates)" : '')
  rank_column = "ts_rank('{1, .9, .1, 0}', term_vector, '#{query}') #{coordinates_weight} AS rank"

  # If we're given multiple models to search return search records directly. If we're only given one particular model then we can return that model's records
  # This allows to return an ActiveRecord Relation object if needed for further querying or by passing an array with multiple models for display in a mixed
  # global search results page or simply as a way to get the underlying search records for a given search term.
  search_query = if models.is_a? Array
                   select("#{table_name}.*", rank_column).where(searchable_type: models.map(&:name))
                 else
                   models.select("#{models.table_name}.*", rank_column).joins("INNER JOIN #{table_name} ON #{table_name}.searchable_id = #{models.table_name}.id")
                 end

  return search_query.where(sanitize_sql_for_conditions(["term_vector @@ to_tsquery('simple', ?)", query])).order(:rank)
end
{% endhighlight %}

When it's all said and done, the final interface for using all of this looks as follows:

{% highlight ruby linenos %}
# Making a model searchable:
class Airport < ApplicationRecord
  include Searchable
  searchable({column: :code, weight: ['facility_use = \'PU\'', :A, :B]})
end

# Performing a query:
class AirportsController < ApplicationController
  def search
    coordinates = (params['latitude'] && params['longitude'] ? {latitude: params['latitude'].to_f, longitude: params['longitude'].to_f} : nil)

    results = Search.query(params[:query], Airport, coordinates, wildcard: true).limit(10).uniq
    render json: results.map {|airport| {code: airport.code, label: airport.name}}
  end
end

# Reindexing all records:
Search.reindex!

# Reindexing a single record:
Airport.first.search_reindex!
{% endhighlight %}

Full code listings are available at:

* [app/models/search.rb](https://github.com/shanet/pirep/blob/3bf47a61a6a8725cc4df16206a0abcefdea89aeb/app/models/search.rb)
* [app/models/concerns/searchable.rb](https://github.com/shanet/pirep/blob/3bf47a61a6a8725cc4df16206a0abcefdea89aeb/app/models/concerns/searchable.rb)
* [app/models/airport.rb](https://github.com/shanet/pirep/blob/3bf47a61a6a8725cc4df16206a0abcefdea89aeb/app/models/airport.rb#L21)
* [app/controllers/airports_controller.rb](https://github.com/shanet/pirep/blob/3bf47a61a6a8725cc4df16206a0abcefdea89aeb/app/controllers/airports_controller.rb#L76)
* [app/controllers/concerns/search_queryable.rb](https://github.com/shanet/pirep/blob/3bf47a61a6a8725cc4df16206a0abcefdea89aeb/app/controllers/concerns/search_queryable.rb)

In conclusion, Postgres' full text search has been an extremely performant and flexible tool that let me push complex logic directly into the database that I did not originally think was possible. Moreover, for a small project like mine, being able to have fairly sophisticated search functionality built inside of an existing piece of my stack without needing to use (and pay for) another service is hugely beneficial as well. It's certainly not the be-all-end-all of search functionality, but it will more than sufficiently handle a large number of search use cases nearly out of the box by only writing a few SQL queries. What else can you ask for?
