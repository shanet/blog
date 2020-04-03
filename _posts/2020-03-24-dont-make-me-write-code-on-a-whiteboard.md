---
layout: post
title: Don't make me write code on a whiteboard
date: 2020-03-24
hidden: true
---

[This is part of a series]({% post_url 2020-04-02-hiring-and-being-hired-for-software-engineers %}) on my experiences and learnings after conducting 750+ interviews and reviewing 10,000+ more over the course of five years. From both the candidate and interviewer sides of the table.

---

Fortunately for all of us, web-based programming environments have come a long way in the past decade. Why then are so many candidates still asked to write code on a whiteboard during an interview?

The most critical part of any technical software engineer interview is the programming problem. The part where the rubber meets the road and the candidate is asked to write code to solve a problem. Regardless of if it's FizzBuzz or writing a red-black tree implementation from scratch in assembly, the stereotype of whiteboarding is very much still alive. For an in-person interview it may be an actual whiteboard, but for phone screens it may be a collaborative text editor without any features of an IDE or even the ability to execute code. Unlike ten years ago&hellip;

> Fully functional web-based IDE exist, let your candidates use them

Our goal in interviews is to let the candidate show off their skills to the best of their ability. The best way to do that is to most closely replicate the environment in which programmers actually work. The days of a shared Google Drive document or collaborative text editor being an acceptable environment for this are long over. Throwing a candidate into this type of environment and expecting them to be successful is like asking someone to race in an F1 circuit with a tricycle. Not having basic code editing features such as syntax highlighting is a big hindrance and distraction to your candidates.

At the most basic level, the basic features of an IDE should be supported: syntax highlighting for common languages, keyboard shortcuts, dark/light themes, and indentation handling. The least we can do is provide an environment intended for writing code (looking at you, Google Docs).

The next iteration is to provide functionality for executing code. This is a bigger ask because of the need for a backend service to do the compiling and executing as well as handling all of the stability and security concerns that come along with arbitrary code execution. However, there are numerous services available today offering an out of the box solution for this. The difference between writing code intended to be executed vs. just looked at is night and day for various reasons. Yet, it's still surprisingly uncommon.

> The biggest differentiator you can make is letting your candidates execute code

The ability to execute code is positive for both candidates and interviewers. For candidates they have the ability to rapidly iterate on their code and actively debug albeit with print statements in lieu of a debugger. This builds confidence they are headed in the right direction towards a solution and that is it working as intended. For interviewer, it goes a long way towards making the interview consistent and equal. Rather than looking at the code and having to make a judgment call on if it looks complete or not, we can instead run the code to confirm it's correct when tested against a pre-determined set of test cases. Having to make the compiler happy also forces the candidate to demonstrate their ability to write syntactically correct code. Far too many candidates struggle to understand syntax errors. Seeing how they handle those can raise a big red flag you otherwise wouldn't capture without executing code.

But executing code in interviews is old news now too. With the advent of fully functional web-based IDEs we now have the ability to offer code completion in interviews. At the basic level, code completion can be done by providing lists of tokens that are already written, but other projects like [Microsoft's Language Server Protocol](https://microsoft.github.io/language-server-protocol/) give us the ability to connect the same code auto-completion used in desktop-based IDEs in web applications. This brings us close to feature parity with online interviews and allows the candidate's provided environment to be as close as possible to their normal working conditions. The closer we can get to the actual daily working environment the more accurate reflection of the candidate we get. By minimizing environmental distractions the better signal on the candidate we get as well.
