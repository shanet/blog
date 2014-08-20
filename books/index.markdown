---
layout: page
title: Books
---

<p>The following is a short collection of software related books I've read that I would recommend to others.</p>

{% for book in site.data.books %}
  <div class="book-container">
    <div>
      <img class="book-image" src="{{ book.image | prepend: site.images_dir | prepend: site.baseurl }}" />
    </div>

    <div class="book-info">
      <div class="book-title">
        {{ book.title}}
      </div>

      <div class="book-description">
        {{ book.description }}
      </div>
    </div>
  </div>
{% endfor %}

<p>* credit: Wikipedia
<br />
** credit: Amazon</p>
