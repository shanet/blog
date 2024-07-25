---
layout: post
title: Projects
---

<a href="https://github.com/shanet"><img src="/assets/images/badges/github.svg"></a>

{% for group in site.data.projects %}
  <h3 class="projects-section">{{ group[1].title }}</h3>
  <p>{{ group[1].description }}</p>

  <div class="projects">
    {% for project in group[1].projects %}
      {% include project.html project = project %}
    {% endfor %}
  </div>
{% endfor %}
