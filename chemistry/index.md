---
layout: page
title: Chemistry Projects
---

As part of my work with the Penn State Chemistry Department to create the tools necessary for an online version of the freshmen chemistry course, I have created various Drupal modules and webpages. These include:

* Homework module
* Syllabus module
* eBook module
* Jmol module
* Atomic orbital visualizations page
* Atomic orbital monte carlo page
* Data tables module

All of the modules are tightly integrated with one another. For instance, a professor is able to create a syllabus that automatically links to the relevant eBook sections for the topics being discussed in class for a given day and the homework assignment for that week. Further, a professor is able to link sections of the eBook with homework assignments or just suggested problems or other pages on the website (such as the atomic orbital visualization pages).

The atomic orbital pages help students visualize atomic orbitals. This rendering of the actual orbital is done with the [Jmol](http://jmol.sourceforge.net) project.

The first atomic orbital page deals strictly with atomic orbitals. Without going into too much detail about the chemistry and math behind it, it basically allows students to view different atomic orbitals to better help visualize their shapes and sizes.

![]({{ site.base_url }}/assets/images/chemistry/orbitals.png)

A more advanced page does monte carlo simulations with various data on atomic orbitals and displays the results in a Jmol display and graph. The gory details of this are detailed in our paper in the [Journal of Chemical Education](http://pubs.acs.org/doi/full/10.1021/ed300393s) that talks about it more in depth.

![]({{ site.base_url }}/assets/images/chemistry/cross-section.png)
