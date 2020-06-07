---
layout: page
title: Aviation
---

<blockquote>Science, freedom, beauty, adventure: what more could you ask of life? Aviation combined all the elements I loved.</blockquote>

&ndash; Charles Lindbergh

{% for video in site.data.aviation %}
  <iframe width="853" height="480" src="https://www.youtube-nocookie.com/embed/{{ video.id }}?rel=0" frameborder="0" allowfullscreen></iframe>
{% endfor %}
