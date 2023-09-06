---
layout: post
title: Photography
---

<div class="albums image-grid">
  {% for album in site.albums %}
    <div class="album-container grid-item">
      <a href="{{ album.url }}">
        <img class="thumbnail" src="/assets/images/albums/{{ album.album_directory }}/thumbnails/{{ album.cover }}">
        {{ album.title }} {% if album.date_ %}- {{ album.date_ }}{% endif %}
      </a>
    </div>
  {% endfor %}
</div>
