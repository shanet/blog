---
layout: page
title: Projects
---

{% for project in site.data.projects %}
  <div class="project-container">
    <div>
      <a href="{{ project.link }}"><img class="project-image" src="{{ project.image | prepend: site.images_dir | prepend: site.baseurl }}" /></a>
    </div>

    <div class="project-info">
      <div class="project-title">
        <a href="{{ project.link }}">{{ project.name }}</a>
      </div>

      <div class="project-link">
        <a href="{{ project.link }}">{{ project.link }}</a>
      </div>

      <div class="project-description">
        {{ project.description }}
      </div>
    </div>
  </div>
{% endfor %}
