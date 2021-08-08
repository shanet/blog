---
layout: post
title: What Are You Assessing Your Candidates For?
date: 2020-03-29
hidden: true
---

[This is part of a series]({% post_url 2020-04-02-hiring-and-being-hired-for-software-engineers %}) on my experiences and learnings after conducting 750+ interviews and reviewing 10,000+ more over the course of five years and from both the candidate and interviewer sides of the table.

---

The timeless question of designing a software engineering interview is what to ask your candidates. Traditionally, ambiguous programming problems are asked that don't have a clear stated objective and mix together multiple concepts. Using a single question to get the full picture on a candidate in order to make the right hiring decision is nothing more than taking a shot in the dark. By limiting the number of variables we can better control the signal received from the candidate.

The first principle that should come to mind when designing a question to ask in a technical interview is similar one of the guiding principles of the UNIX philosophy:

> Assess One Thing And Do It Well

Meaning that your questions should focus on one particular area of expertise and be independent from other areas. For example, a common interview paradigm is to ask a programming question which expects the candidate to start by asking questions to determine the scope of the problem, what is valid input and what is invalid. Then planning the approach to solve the problem followed by implementing said approach. They then have to debug their code and determine what the valid test cases are. Finally, they might be asked to analyze the time and space complexities of their solution and go over how to further optimize it.

> The issue is that one question designed to assess all concepts will assess none well as it breaks the single responsibility principle

The situation outlined above encompasses all aspects of the software development lifecycle. A better approach is to determine which areas you care most of about as they relate to the candidate's expected day-to-day tasks. For example, we as programmers spend most of our time reading code and debugging code. We rarely need to worry about the theoretical time complexity of an algorithm. So why focus on it in an interview? It's not that it's not valuable information, but given a limited amount of time with a candidate, every minute we dedicate to some part of writing code needs to be utilized in the most effective manner possible.

With that in mind, we can devise a method to design our interviews around assessing one skill at a time. For example, we might dedicate 15 minutes to testing, 15 minutes to debugging, and 15 minutes to algorithms and data structures. This way we can focus specifically on those areas to determine where a candidate is strong and where they are weak. There's a myriad of different skills to assess for so which ones do you focus on? Well, for an on-site interview loop it's critical to coordinate with other team members to get coverage over all of those areas and avoid overlap. For a phone screen where your time is more limited you have to ask what are the skills you find most important to being a functional member of your team. There are a few common categories to consider depending on role and seniority of candidate:

* Data structures and algorithms
  * Traditional computer science fundamental questions
* Optimization and performance
  * Given a piece of code how can it be optimized?
* System design / architecture
  * What's wrong with the high level design of this system? How would you design X?
* Debugging
  * Given a piece of code, can you debug and fix it?
* Testing
  * Determine what's valid/invalid input for some code and write comprehensive test cases for it
* Code review / reading code
  * Given a piece of code, can you make sense of it and explain what it's doing and how it works? What are its shortcomings? How could it be improved?

Ask yourself which of these do you typically do most on the average day. That's probably where you want to focus most of your energy. The opposite is true of most interviews though. We tend to ask the traditional data structures and algorithms questions when little to none of our time is spent, say, writing algorithms to implement a binary search tree. Our most common data structures are hashmap and arrays. Your candidates better know those extremely well, but beyond the basics the law of diminishing returns applies. Rather, the common tasks of an engineer involve debugging code, reading code, and writing relatively basic code. Consider asking questions that test these skills. For example, give a candidate a piece of buggy, half implemented code and ask them to first read and understand it and then debug it so it works as intended. This more closely simulates what they'll be doing on their first day of work: reading your existing codebase rather than starting a greenfield project.

You may also ask some domain or framework specific questions. For example, for a devops engineer you might ask about system design, deployments, and cloud hosting. For a web developer you'll probably ask about web concepts. These are directly related to the day-to-day tasks your candidate will be performing. One large caveat to this, however, is to avoid language or framework specific questions. Any high quality candidate worth hiring will have the ability to learn quickly and pick up technologies they haven't used before. For example, asking someone that has been working with Angular for years all about the finer details of React when they have no experience with React is a pointless exercise. Of course, they won't do well, but that doesn't mean they wouldn't be able to quickly pick it up within a month or two on the job.

The design of your interview is a critical task that cannot be overlooked. The run of the mill data structures and algorithms questions fail to accurately assess candidates for what our daily tasks as engineers commonly are. The easier questions have value in filtering out lower performing candidates that are uncomfortable writing basic code, but beyond that they have diminishing returns. Moving beyond them to more creative exercises which are independent of one another will help improve your signal to noise ratio coming out of an interview.
