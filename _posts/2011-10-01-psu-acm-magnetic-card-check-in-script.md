---
layout: post
title: Penn State ACM Magnetic Card Check-in Script
date: 2011-10-01
---

The other officers and I of the PSU ACM have been talking about implementing a magnetic card based check-in system for our meetings and other events. When you check-in (swipe your card) you would receive a certain number of points. The member with the most points at the end of the semester would win a prize like most likely a half eaten bag of Skittles or something. I found the whole project interesting so I took it up and had the whole thing working in just under a day.

Skip to the bottom for a link to the full source.

To formalize... the goal: Write a program that reads data from a magnetic card, queries a database for the card info, and updates a points field in the database. It must also have an option to display the current point values of everyone in the database and run under the best OS ever, Linux.

So how does it all work?

First, and most importantly, I needed a card reader! After looking into cards readers a little bit I determined that the best option was to get one that emulated a keyboard (which is apparently most of them). This way, the program could just use a regular input statement to get the info off the card. At the end of the day, I ended up going with the <a href="http://www.buy.com/prod/magtek-magnetic-stripe-swipe-card-reader/202354417.html">Magtek 21040108</a>. It's a no-frills card reader; that is, it reads all three tracks and gets the job done.

With a card reader acquired it was time to turn my attention to the database. This part was easy, I set up a new database on our web server with the following structure:

{% highlight sql linenos %}
cardID varchar primary key
accessID varchar
points int
lastCheckin timestamp on update

{% endhighlight %}

The <code>cardID</code> is the info directly from the cards. This is absolutely guaranteed to be unique so it is a natural choice for the primary key. We also want to keep track of the time of last check-in which will automatically update with the current time whenever a record is updated, but more on this later. With the database design complete, it was time to write some code.

I decided to take this opportunity to become acquainted with Python. I had wanted to play with Python for a long time and this seemed like the perfect opportunity, and the perfect application for it.

After writing a quick Hello World program to become familiar with the new little nuances of a new language, I went searching for a way to talk to MySQL through Python. Enter the <a href="http://mysql-python.sourceforge.net/MySQLdb.html">MySQLdb module</a>. Import that sucka', read the manual, and you're off and running.

So, let's take a look at some of the more interesting parts of the code.

<!--more-->

First up, the card swipe code.

{% highlight python linenos %}
def getCardSwipe():
   # Compile the regex for pulling the card ID from all the data on a card
   regex = re.compile(";(.+)=")

   while 1:
      # Read the card data as a password so it doesn't show on the screen
      cardData = sanitizeInput(getpass.getpass("Waiting for card swipe..."))
      try:
         # Return the card ID
        return regex.search(cardData).group(1)
      except AttributeError:
         # If exit or back, just return to go back
         if "exit" in cardData or "back" in cardData:
            return "exit"
         # Else, a match wasn't found which probably means there was
         # and error reading the card or the card isn't a valid ID card
         # but assume the former
         else:
            print "Error reading card. Swipe card again."
   return ""

{% endhighlight %}

The whole function is pretty simple. We read in the card and sanitize the input to prevent any SQL injection attempts (more on this later), then extract the card ID with the help of a neat-o regular expression. If for some reason it fails to make a match, which will normally happen if the user swipes their card too slow, it will keep trying until it gets a match.

What about adding a new card to the database? Easy!

{% highlight python linenos %}
# Get the access ID associated with this card ID
accessID = sanitizeInput(raw_input("Access ID: "))

# Add the new record into the DB
cursor.execute("INSERT INTO points (cardID, accessID, points) values ('" + cardID + "', '" + accessID +
               "', " + initialPoints + ");")

# Print a confirmation message
print "n" + accessID + " added to database"

{% endhighlight %}

This is an exert from the <code>insertCard</code> function. When adding a new card, the user must enter their access ID. This is much easier to see who has the most points than keeping track of card IDs. Again, we sanitize the input to prevent SQL injection, and then insert a new record in the database.

How about actually awarding points to a user when checking in? Ironically, this is the most complicated processes of the whole program. First, we go ahead and get the card swipe, and then we get the last check-in time. The whole purpose of the last check-in timestamp is to prevent someone from swiping their card five times really fast and racking up illegitimate points (yes, it's a little over the top for a bag of Skittles, but we hope to give away more valuable prizes in the future). Thus, a user is only allowed to check-in once per hour. Unfortunately, this is made more difficult considering the database server is on mountain time and our local system is on eastern time. We need to do some timezone adjusting here. Let's take a look:

{% highlight python linenos %}
# Verify the check-in times
curDate = datetime.now()
lastCheckin = result[0];

# The last_checkin column was added after the DB was populated meaning it could be a NoneType
# Only check the dates if this is not the case
if lastCheckin and datetime.date(curDate) == datetime.date(lastCheckin):
   # The DB server is on mountain time. Adjust the local time (eastern),to mountain
   if datetime.time(curDate).hour == 1 or datetime.time(curDate).hour == 0:
      tmzAdjust = 22
   else:
      tmzAdjust = -2

   # Check that the current system time is at least one hour greater than the last check-in time
   if (datetime.time(curDate).hour+tmzAdjust == datetime.time(lastCheckin).hour or
       (datetime.time(curDate).hour+tmzAdjust == datetime.time(lastCheckin).hour+1 and
        datetime.time(curDate).minute < datetime.time(lastCheckin).minute)):
      print "You can only check in once per hour."
      continue
   # If the current system time is before the check-in time, do not allow check-in
   elif datetime.time(curDate).hour+tmzAdjust < datetime.time(lastCheckin).hour:
      print "Last checkin time was in the future. Not allowing check-in. Check your system time."
      continue
   # If the current system date is before the check-in date, do not allow check-in
   elif lastCheckin and datetime.date(curDate) < datetime.date(lastCheckin):
      print "Last checkin time was in the future. Not allowing check-in. Check your system time."
      continue

{% endhighlight %}

Holy if conditions Batman! Well, rather than dealing with all the timezone functions and what-not, since we are only converting from one timezone to another, I found it easier to just manually convert the hours. It's simple really, just subtract two (or add -2 as it's programmed) and add 22 if the local hour is 0 or 1 (remember, we're dealing in 24 hour time here). From there, it's a nasty if statement to determine if the user can check-in or not. I won't go into it; the logic is in the code. While we're at it, also check for the last check-in time being in the future (that error message should really be moved to a string that can be changed in only one place). This most likely means that the local system time is incorrect. In any of these cases, the check-in code is in a big while loop, so just continue on to the next iteration so that someone else can check-in.

As for actually awarding points, it's just a simple SQL query. Consider the following:

{% highlight python linenos %}
# Update the database with the new points
cursor.execute("UPDATE points SET points=points+" + pointValue + " WHERE cardID='" + cardID + "';")
# Grab the access ID that just checked-in to print confirmation
cursor.execute("SELECT accessID FROM points WHERE cardID='" + cardID + "';")

result = cursor.fetchone()
print result[0] + " +" + pointValue + " points"

{% endhighlight %}

And for the last major feature of the program. Let's display a leaderboard of everyone in the database. This, too, is a simple SQL query, just with some pretty formatting done to the results.

{% highlight python linenos %}
# Either get all access ID's and points from DB or just one access ID
if accessID.lower() == "all":
   cursor.execute("SELECT accessID, points FROM points ORDER BY points DESC;")
else:
   cursor.execute("SELECT points FROM points WHERE accessID='" + accessID + "';")

# Show error if not results (access ID is not in database)
   if cursor.rowcount == 0:
      print "nQuery returned no results."
   else:
      result = cursor.fetchall()

   # If showing all users, display a pretty table
   if accessID.lower() == "all":
      print "+--------------------+| Access ID | Points |+--------------------+"
      for i in range(cursor.rowcount):
         print "|%10s | %6s |" % (result[i][0], result[i][1])
      print "+--------------------+"
   # Show a single user's points
   else:
      print "n" + accessID + " has " + str(result[0][0]) + " points"

{% endhighlight %}

This chunk of code either shows a leaderboard of all users or a single user's points. Let's focus on the former. Basically, an SQL query gives us all the data, already sorted, in an array, or tuple is what I believe Python calls it. Regardless, then it's just some ASCII tricks and a for loop to print everything out in a MySQL-style table.

Now, let's talk security. No one likes SQL injections. Well, except for the injectors. I doubt anyone would want to try and damage our database, but it never hurts to always be thinking about security. Hence, here's a little function to sanitize any input that will be included in a query:

{% highlight python linenos %}
def sanitizeInput(input):
   # Keep a copy of the possibly mixed-case input
   origInput = input
   input.upper()

   # The reserved words to check for
   # There are many more, of course, but these should thwart the most dangerous attacks
   keywords = ["DELETE", "UPDATE", "DROP", "CREATE", "SELECT", "INSERT", "ALTER"]

   # Check for a match
   for i in keywords:
      if i in input:
         return ""
   # If no match, return the original input
   return origInput

{% endhighlight %}

I'm sure there are better and more proper ways to do this (escaping SQL reserved words for instance), but this method works just as well. Since none of those keywords will ever need to be in our database, simply reject any input with any of them in it.

Overall, I learned a lot from writing this little guy (most importantly, a can read Python code with some proficiency now). The full script checks in at just over 300 lines. Not too shabby. It was a pretty fun weekend project that will be used on a weekly basis for our club. So what's next? I'm sure that the needs of this little check-in script will grow and change over the semesters. Maybe a GUI for it? More functions to edit and query the database built in? We'll see how it goes.

If you want to see the full source, everything is open source and available over on <a href="https://github.com/shanet/PSU-ACM-Checkin-Script">GitHub</a>.
