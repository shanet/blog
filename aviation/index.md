---
layout: post
title: Aviation
---

<blockquote>Science, freedom, beauty, adventure: what more could you ask of life? Aviation combined all the elements I loved.</blockquote>

&ndash; Charles Lindbergh<br><br>

{% for video in site.data.aviation %}
  <div class="aviation-video">
    <video controls {% if forloop.index > 0 %}preload="none"{% endif %} {% if video.poster %}poster="/assets/images/video_posters/{{ video.poster }}"{% endif %}>
      <source src="/assets/videos/{{ video.filename }}" type="video/webm">
    </video>

    <span>{{ video.description }}{% if video.date %}, {{ video.date }}{% endif %}</span>
  </div>
{% endfor %}
