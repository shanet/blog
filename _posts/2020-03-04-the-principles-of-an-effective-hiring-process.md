---
layout: post
title: The Principles of an Effective Hiring Process
date: 2020-03-04
hidden: true
---

[This is part of a series]({% post_url 2020-04-02-hiring-and-being-hired-for-software-engineers %}) on my experiences and learnings after conducting 750+ interviews and reviewing 10,000+ more over the course of five years. From both the candidate and interviewer sides of the table.

---

Designing a hiring process for your engineering team is a big task. Unfortunately, our industry has a reputation for hiring processes that are rife with conscious and unconscious biases, subjective outcomes, and inconsistencies. Resolving these while also figuring out a hiring process that works for your team is a hard problem to solve. Fortunately, there are some guiding principles that can make it easier and an all around better process for both your team and your candidates.

## Assess one skill at a time

The traditional programming question in an interview combines many aspects. Question prompts are left intentionally vague to test if the candidate can think of edge cases. Invalid and malformed inputs are given to test if the candidate can handle input validation. Test cases are not given to test if the candidate can determine what to test and how to write tests. And then there's the actual act of solving the problem. Combining so many variables into a single assessment results in a poor and muddled signal on the performance of the candidate. They might do well on one part, but poor on another. Or they perform poorly at asking clarifying questions which results in them missing an important aspect of the problem and therefore has downstream failures to handle all possible test cases.

> In order to get the best signal on a candidate's performance interview questions should be designed to assess one skill and assess it well.

Instead of spending the entire length of the interview on a single, overarching problem, consider breaking it up into specifically designed components. One assesses traditional algorithms and data structures skills, another assesses identifying corner cases and testing skills, another tests reading unfamiliar code and debugging skills. You then have the ability to objectively look at the candidate's performance on a set of independent skills, rank them accordingly, and come to a clearer picture of if they would be a good fit.

## Make it objective

Most hiring processes suffer from a severe lack of repeatability, are wholly subjective, and treat candidates unequally. The ideal hiring process treats all candidates the same, is repeatable regardless of candidate, and thrives on objective outcomes.

The end result of an interview should always be an objective assessment of the candidate. We, as interviewers, typically have an idea of what level of performance we're looking for, but it's typically unique to us and it manifests itself in a paragraph or two of written feedback submitted to a hiring manager after the interview. If asked to defend how the interviewer came to that conclusion little or no objective reasoning could be provided and instead subjective feelings are relied on.

> Feelings are a poor indicator of a good candidate.

We all have our unconscious biases. Even if we're just agitated during an early morning interview because of unusually heavy traffic on the drive in that day. Having an objective hiring process removes a large part of the human factor from the interview.

To combat this, define a measurement of performance for your interviews. Treat it like a test that can be assigned a numerical score. Your team can decide what factors are most important in a candidate around this. Then assign a score for how well the candidate performs in those areas. The caveat being that the areas the candidate is assessed on must be objective as well. For instance, the approach a candidate takes on a given problem must be scored as more or less optimal based on a defined metric rather than how the interviewer would prefer it be solved. A good mechanism for this is to score approaches for solving a problem based on their Big-O complexity. Two linear solutions, regardless of how convoluted are the same for this metric. You may then have another metric for how clean the code is which could be measured by how many comments would be left if that code were put through code review and their severity.

After obtaining a numerical score of the interview if the candidate is above or below the threshold for what you've decided, you have your answer on the outcome of the interview. Of course, exceptions can always be made for extenuating circumstances, but for the vast majority of cases, you now have an objective, repeatable, and equal method for assessing candidates.

## Make it equal

A common request from a candidate is for extra time to finish off a question. Or maybe the interviewer can see that the candidate is close to finishing a problem and gives them extra time to finish it. This may come at the expensive of time allocated at the end for any questions or by extending the end of the interview. Regardless of the scenario, this introduces inequality to the interview.

> All candidates should be given the same interview experience

Aside from time inequality, a candidate might be given a more difficult or easier set of questions based on their background or simply because the interviewer picked an easier question set than previously. Question difficulty is an especially difficult problem to mitigate and likely deserves an article of its own, But in short, it's impossible to create two questions of the exact same difficulty. However, you can take care to get them fairly close. When writing a question, ask your teammates to go through the problem. Time them, score them, and see how well one question matches up with another. Then adjust the question as necessary. If you have a numerical score defined, consider adding a curve to it to account for the easier or harder questions.

When it comes to allotted time, stick to a strict time limit. If the candidate has 30 minutes to solve a problem, that's all they get, no exceptions. It can be frustrating for a candidate to be close to finishing a problem and be cut off though. In those cases, asking for them to verbally walk through what they have left to finish can be a good middle ground to help the candidate feel heard without it counting towards their performance on the given question.

Equal interviews facilitate the ability to compare candidates effectively. Without everyone being given the same experience it becomes impossible to know which candidates performed better than others and then you're right back into the world of subjectivity.

## Quality control it

The need for retrospection is critical in all aspects of software engineering, and life in general. Your hiring process should be no different. We've all been in the position where you feel your interviews failed to determine the right decision. Be it either a false positive or false negative. When this happens you have a great opportunity to review where the failure happened, why it happened, and how to prevent it from happening in the future. Make sure that everyone is assessing what they're intending to and doing it correctly.

Consider recording at least some of your interviews. There is an inherit power dynamic mismatch in interviews where the interviewer has the upper hand. Without any type of accountability some people will unfortunately abuse this power to a certain degree. Even a small amount of rudeness can deter your best candidates. Having the interview be recorded and reviewed at a later date gives everyone involved a sense of accountability and allows a hiring manager to determine without ambiguity how questions are being presented and how to improve the interview. In my experience, very few candidates will object to having an interview recorded, but do take care to ensure the candidate is aware of the recording.

## Get the team on board

Everything above is good for an individual interviewer to establish in their own practices. Where it will really shine, however, is getting the entire team on board. Rather than defining a set of metrics only for what you look for in a candidate, get your team together to do the same for your entire hiring process. Start with the initial phone screen with a recruiter or hiring manager. Then to the technical phone screen. And finally to the on-site loop. The end result in a hiring process that is objective and focused from end to end.
