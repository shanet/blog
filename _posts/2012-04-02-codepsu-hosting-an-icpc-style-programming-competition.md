---
layout: post
title: ! 'CodePSU: Hosting an ICPC-style Programming Competition'
date: 2012-04-02 01:05:12 -0700
---

Just over a month ago the other officers of the Penn State ACM and I were approached by the president of the newly-formed Penn State of Association of Women in Computing to co-host a programming competition which would come to be known as <a title="CodePSU" href="http://acm.psu.edu/codepsu">CodePSU</a>. We set the date of the event and had roughly one month to plan everything. Most of the logistical (location, food, times) and financial (sponsors, prizes) were not handled by me. Rather, I tasked myself with designing and implementing a code submission system that allowed teams to upload solutions to problems to the judges. The catch? It had to be fast. We would have three judges judging 60 people's code multiple times in just three hours. It also had to be secure. We couldn't allow teams to figure out what test cases we where judging the problems with or allow them to get access to other teams code. If that wasn't enough, we also had to support C, C++ and Java.

<!--more-->

My solution: A form on our website that would upload source code files to a PHP script on our server. The PHP would put a team's solution in a unique directory, create a Makefile, compile it, and alert the judges that a new submission has been received.

<hr />

<strong>First up: The form UI</strong>

![]({{ site.baseurl }}/assets/images/2012/04/codepsu1.png)


The UI was designed to be very simple with minimal points of failure. On the day of the competition, the Team and Problem drop down menus were filled with the names of all the teams and problems via a Javascript array. Additionally, our submission system supported an arbitrary number of source code files. If a team wanted to break a solution into more than one file, the Add More Files button would add a new file input field to the page to allow for multiple file uploads.

To make feedback a little easier, our website is powered by Drupal. This allowed the PHP script to use the Drupal API's to show immediate feedback to the teams such as their solution failed to compile, or just a confirmation that their solution was received and they would receive a result soon.

Most of the Javascript that sets up this form is pretty boring, but lets look at the Add More Files button handler.

{% highlight javascript linenos=table %}
function addFileInput() {
    var fileInputs = document.getElementById("fileInputs");
    var newBR = document.createElement("br");
    var newInput = document.createElement("input");

    newInput.setAttribute("type", "file");
    newInput.setAttribute("class", "fileInput");
    newInput.setAttribute("name", "files[]");
    newInput.setAttribute("size", "60");

    fileInputs.appendChild(newBR);
    fileInputs.appendChild(newInput);
}

{% endhighlight %}

Basically, when the button is clicked, it grabs the div the file inputs are in and creates a new file input and line break and adds them to the div.

<hr />

<strong>The submission script</strong>

The rules of competition only allowed one computer per team so my first security concern was how to ensure that each team was only allowed to upload from one computer. Along the same lines, we had to make sure that a team couldn't have more people working on the problems at a remote location and uploading solutions also. Since our server was inside Penn State's network and all the competitors were too, my solution was to record the IP address of the computer of a team and then check their IP each time a problem was submitted. Since the competition was three hours long, there should be no reason for a team to have their IP change during the competition. Additionally, before the competition we ran through a sample problem to show teams how to submit their code. This not only got them familiar with the system, but also got each team's IP on our server. Here's the quick PHP file that performed this check:


{% highlight php linenos=table %}
<?php
function isValidIP($remoteIP, $uploadDir, $teamName) {
    // Check if the team dir and make it if not
    if(!file_exists($uploadDir . $teamName)) {
        mkdir($uploadDir . $teamName, 0774);

        // If the team dir didn"t exist, write the IP to a file
        $ipFile = fopen($uploadDir . $teamName . "/" . "ip.txt", "w");
        fwrite($ipFile, $remoteIP);
        fclose($ipFile);

        return True;
    } else {
        // Read the IP and compare it to the current IP
        $ipFile = fopen($uploadDir . $teamName . "/ip.txt", "r");
        $ip = fread($ipFile, 100);

        return ($ip == $remoteIP);
    }
}

{% endhighlight %}


<strong>Creating Unique Solution Directories</strong>
The next task was to create a directory structure as such:

{% highlight text linenos=table %}
team_number/problem_number/revision_number

{% endhighlight %}

This allowed us to keep every version of a solution that a team uploaded. However, this directory structure would have to be created on the fly so I needed two functions that would create it for me.

{% highlight php linenos=table %}
<?php
function createProblemDir($uploadDir, $teamName, $problemNo) {
    // Check if the problem dir exists and make it if not
    if(!file_exists($uploadDir . $teamName . "/" . $problemNo)) {
        mkdir($uploadDir . $teamName . "/" . $problemNo, 0774);
    }
}

{% endhighlight %}


{% highlight php linenos=table %}
<?php
function createRevDir($uploadDir, $teamName, $problemNo) {
    // Find the highest revision dir
    $revNo = 0;
    while(file_exists($uploadDir . $teamName . "/" . $problemNo . "/rev_" . $revNo)) {
        $revNo++;
    }

    // Create a new revision dir
    mkdir($uploadDir . $teamName . "/" . $problemNo . "/rev_" . $revNo, 0774);

    // Put the upload time in the new revision dir
    $timeFile = fopen($uploadDir . $teamName . "/" . $problemNo . "/rev_" . $revNo . "/time.txt", "w");
    fwrite($timeFile, date("D, d M Y H:i:s T") . "\n");
    fclose($timeFile);

    return $revNo;
}

{% endhighlight %}

The team and problem directories are straightforward. As noted before, the IP address of the team is stored in a text file in their team directory. The revision directory is slightly more interesting. The function will find the first unused <code>rev_X</code> directory, create it and write the current time to a text file in the directory so we could keep track of when a solution was uploaded.

<hr />

<strong>Supporting Multiple Languages</strong>

We allowed teams to submit solutions in either C, C++ or Java, but, of course, we couldn't mix languages. So submissions had to be checked to ensure they only contained one type of source code files. Mime-types are an obvious solution to this, except I found in my testing that Windows would like to put a few bytes of junk at the beginning of text files that caused PHP's mime-type determination to break down so I had to fallback on relying on file extensions to do this check.


{% highlight php linenos=table %}
<?php
// Create a new array so we don't have to deal with mime-types
for($i=0; $i<count($_FILES["files"]["name"]); $i++) {
    if($_FILES["files"]["name"][$i] != "") {
        switch(end(explode(".", $_FILES["files"]["name"][$i]))) {
            case "c":
                array_push($types, "c");
                $lang = "c";
                break;
            case "h":
                array_push($types, "h");
                break;
            case "cpp":
                array_push($types, "cpp");
                $lang = "cpp";
                break;
            case "java":
                array_push($types, "java");
                $lang = "java";
                break;
            default:
                drupal_set_message("ERROR: " . $_FILES["files"]["name"][$i] . " ("
                                   . $_FILES["files"]["type"][$i] .
                                   ") is not a valid file type. All files must be .c, .cpp, " .
                                   ".h, or .java. Your submission was NOT received.", "error");
                return;
        }

        // Check for conflicting file types as we populate the new file type array
        for($j=0; $j<count($types); $j++) {
            if($types[$i] == "c") {
                if($types[$j] == "cpp" || $types[$j] == "java") {
                    drupal_set_message("ERROR: You uploaded source files from multiple languages. " .
                                       "Your submission was NOT received.", "error");
                    return;
                }
            } else if($types[$i] == "cpp") {
                if($types[$j] == "c" || $types[$j] == "java") {
                    drupal_set_message("ERROR: You uploaded source files from multiple languages. " .
                                      "Your submission was NOT received.", "error");
                    return;
                }
            } else if($types[$i] == "java") {
                if($types[$j] == "c" || $types[$j] == "cpp") {
                    drupal_set_message("ERROR: You uploaded source files from multiple languages. " .
                                       "Your submission was NOT received.", "error");
                    return;
                }
            }
        }
    }
}

{% endhighlight %}


Commented out is the remnants from the mime-type switch in case I ever wanted to give them another go. Other than that, it copies the uploaded files into a new file types array and checks each file's file type against the other file types in the array. If there's a problem, we use the Drupal API to show an error message.

<hr />

<strong>Auto-Compiling Submissions</strong>

In one of the more challenging problems I was faced with was auto-compiling solutions. My solution to write a PHP function in the upload script that created a Makefile for submissions and put it in the proper revision directory. This worked great for C and C++ solutions, but Java is not meant to be compiled with Makefiles; you use Ant for that. However, given the relatively simple nature of solutions, it was easier to make a hack-ish Makefile to compile Java programs.


{% highlight php linenos=table %}
<?php
function createMakefile($uploadDir, $teamName, $problemNo, $revNo, $testsDir, $lang) {
    switch($lang) {
        case "c":
        case "cpp":
            $makefile = fopen($uploadDir . $teamName . "/" . $problemNo . "/rev_" . $revNo . "/Makefile", "w");

            // Use bash
            fwrite($makefile, "SHELL := /bin/bash\n");

            // Write the compiler
            if($lang == "c") {
                fwrite($makefile, "CC=gcc -std=c99\n");
            } else {
                fwrite($makefile, "CC=g++ -std=c++98\n");
            }

            // Exec file
            fwrite($makefile, "EXECUTABLE=output\n");

            // Cflags
            fwrite($makefile, "CFLAGS=-O2\n");

            // Source files
            fwrite($makefile, "SRC=$(wildcard *." . $lang . ")\n\n");

            // All rule
            fwrite($makefile, "all:\n\t\$(CC) -o \$(EXECUTABLE) \$(CFLAGS) \$(SRC)\n\n");

            // Test rule
            fwrite($makefile, "test:\n\t../../../../scripts/test_c.sh " .
                              $uploadDir . $teamName . "/" . $problemNo . "/rev_" . $revNo . "/$(EXECUTABLE) " .
                              $testsDir . $problemNo . "_input.txt " .
                              $testsDir . $problemNo . "_output.txt " .
                              $testsDir . $problemNo . "_time.txt\n");

            // Clean rule
            fwrite($makefile, "clean:\n\trm \$(EXECUTABLE)\n");

            fclose($makefile);
            break;
        case "java":
            $makefile = fopen($uploadDir . $teamName . "/" . $problemNo . "/rev_" . $revNo . "/Makefile", "w");

            // Compiler to use
            fwrite($makefile, "CC=javac\n");

            // Source files
            fwrite($makefile, "SRC=$(wildcard *." . $lang . ")\n\n");

            // All rule
            fwrite($makefile, "all:\n\t\$(CC) \$(SRC)\n\n");

            // Test rule
            fwrite($makefile, "test:\n\t../../../../scripts/test_java.sh " .
                              $testsDir . $problemNo . "_input.txt " .
                              $testsDir . $problemNo . "_output.txt " .
		              $testsDir . $problemNo . "_time.txt\n");

            fclose($makefile);
        default:
    }
}

{% endhighlight %}


This created Makefiles such as:

{% highlight makefile linenos=table %}
SHELL := /bin/bash
CC=g++ -std=c++98
EXECUTABLE=output
CFLAGS=-O2
SRC=$(wildcard *.cpp)

all:
	$(CC) -o $(EXECUTABLE) $(CFLAGS) $(SRC)

test:
	../../../../scripts/test_c.sh /var/www/codepsu_submissions/submissions/team_10/p_0/rev_0/$(EXECUTABLE) \
	/var/www/codepsu_submissions/tests/p_0_input.txt /var/www/codepsu_submissions/tests/p_0_output.txt \
	/var/www/codepsu_submissions/tests/p_0_time.txt
clean:
	rm $(EXECUTABLE)

{% endhighlight %}

This is, of course, a C++ submission. After this was created, the upload script would enter the revision directory and run the all rule to compile the solution.

{% highlight php linenos=table %}
<?php
function compileUpload($uploadDir, $teamName, $problemNo, $revNo) {
    // Save the current directory
    $prevDir = getcwd();

    // Go to the problem just submitted and compile it
    chdir($uploadDir . $teamName . "/" . $problemNo . "/rev_" . $revNo);
    system("make > /dev/null", $exitCode);

    // Return the previous directory
    chdir($prevDir);

    return $exitCode;
}

{% endhighlight %}


This would check the return value of make and provide immediate feedback to the submitter if their solution failed to compile.

<strong>Judging Solutions</strong>
The first  problem I had with judging was how to know when a new solution was submitted. To solve this I created a master submission log that would be updated by the upload script every time a new submission was received.


{% highlight php linenos=table %}
<?php
function updateSubmissionLog($uploadDir, $teamName, $problemNo, $revNo, $remoteIP, $compile) {
    $subLog = fopen($uploadDir . "submission_log.txt", "a");
    fwrite($subLog, $teamName . " (" . $remoteIP . ") submitted problem " . $problemNo .
           " (revision " . $revNo . ") at " . date("H:i:s") . (($compile != 0) ? " WARNING: FAILED TO COMPILE" : "")
           . "\n");
    fclose($subLog);
}

{% endhighlight %}


The log would contain the team number, problem number, revision number, time of submission, IP address, and a warning if the solution failed to compile. Even though a solution with an invalid IP would not be uploaded, I wanted to create a comprehensive log of as much info as possible in case we needed to resolve a tie or any type of cheating. The created log looked something like this:


{% highlight text linenos=table %}
team_11 (XXX.XXX.XXX.XXX) submitted problem p_0 (revision 0) at 14:43:29
team_18 (XXX.XXX.XXX.XXX) submitted problem p_0 (revision 0) at 14:43:36
team_14 (XXX.XXX.XXX.XXX) submitted problem p_0 (revision 0) at 14:43:40
team_2 (XXX.XXX.XXX.XXX) submitted problem p_0 (revision 0) at 14:44:04 WARNING: FAILED TO COMPILE

{% endhighlight %}

With the IP's removed, of course. Each of our judges would have a terminal open running the command <code>watch tail submission_log.txt</code> which would show in real-time submissions made. From here, a judge would enter the proper directory of a submissions and run the make test rule. This rule would call a shell script that would run the program with the proper input redirected into it, capture the output, show a diff of the correct output and the output produced and time the execution of the program. There were two scripts, one for C and C++ and one for Java. First, the C/C++ script.


{% highlight bash linenos=table %}
#!/bin/bash

EXECUTABLE_PATH=$1
TEST_PATH=$2
OUTPUT_PATH=$3
TIME_PATH=$4

clear
time $EXECUTABLE_PATH > $TEST_PATH > output.txt

echo -e "\n---------------------------------\nSubmission Output:\n---------------------------------"
cat output.txt
echo -e "---------------------------------\nCorrect Output:\n---------------------------------"
cat $OUTPUT_PATH
echo -e "---------------------------------\nDiff Output:\n---------------------------------"
diff output.txt $OUTPUT_PATH
echo -en "---------------------------------\nAllowable Run Time (sec): "
cat $TIME_PATH

exit 0

{% endhighlight %}

The script is relatively simple. It uses the Bash command <code>time</code> to time the execution time of the program and then cats the output files. All solutions were expected to read input from standard input and write output to standard output. The script directs the proper input and output files to a solution and shows a diff for easy judging. There was also an execution limit time on the problem which is printed at the bottom of the script. This prevented a team from trying to brute force solutions to a problem.

The Java test script is much more messy.

{% highlight bash linenos=table %}
#!/bin/bash

TEST_PATH=$1
OUTPUT_PATH=$2
TIME_PATH=$3

clear

for i in $(ls -1 | sed 's/\(.*\)\..*/\1/'); do
   time java $i < $TEST_PATH > output.txt 2> /dev/null

   if [ $? -eq 0 ]; then
      echo -e "\nWARNING: This is a Java program. Only pay attention to the final set of timings for program execution time."
      echo -e "\n---------------------------------\nSubmission Output:\n---------------------------------"
      cat output.txt
      echo -e "---------------------------------\nCorrect Output:\n---------------------------------"
      cat $OUTPUT_PATH
      echo -e "---------------------------------\nDiff Output:\n---------------------------------"
      diff output.txt $OUTPUT_PATH
      echo -en "---------------------------------\nAllowable Run Time (sec): "
      cat $TIME_PATH

      exit 0
   fi
done

exit 0

{% endhighlight %}

Because running a Java program requires giving java the name of the class that contains the main method sans the file extension of the class it was a challenge to automate running a Java program with the class containing the main method unknown. Thus, my best solution was to just try every file in the directory. If java exited with a non-zero exit code, that file wasn't the one with the main method in it. When it finally found one, the same info as the C test script would be printed.

This messy solution has two major drawbacks.
<ol>
<li>The timings are printed for each file it tries to run. Thus, I put a warning in for the judges to only consider the final set of timings.</li>
<li>This is actually problem with both scripts, if a program gets stuck in an infinite loop, the judges will not know. The output is redirected to a file so a judge would not know if the program is looping forever, or just not outputing anything for some reason.</li>
</ol>

This is a problem that I intend to fix for next year's competition. It will be much easier to simply force teams that write solutions in Java to put their main methods in a pre-determined filename else they will not be accepted.

Once a solution was judged, a judge would edit the submission log saying it was judges so another judge would not waste time testing it again. If a solution was correct, points were awarded to a team on our "scorecard" which was a Google Docs spreadsheet that all judges could edit simultaneously as well as have on a projector so all teams could see the standings in real time. We also provided feedback to teams by having someone physically walk to a team with the results of their submission; either incorrect output, failed to compile, time limit exceeded, or correct. This was more so done due to a lack of time to build an automated feedback system. Speaking of which...

<hr />

<strong>Improvements</strong>

For next year, I'm planning on streamlining the judging system. We ran into problems where a judge went to edit the submission log only to find that log had already been modified by the upload script adding a new submission so the judge would have to close the file without saving and perform his changes again. This became very tedious during periods of many submissions. To solve this I'm going to write a program judging program that takes the team number, and problem number (the latest revision is assumed) and moves the proper directory, runs the make test rule, and allows a judge to enter a result for the problem. It then edits the submission log and puts the result of the submission in a web-accessible per-team log so a team and view a log of the results of only their submissions so we don't need someone to physically go tell a team of their result. This will make the judging much easier and more efficient.

Another problem we ran into was teams writing solutions on Windows and us compiling and testing on Linux. We made it very clear from the beginning that all solutions had to conform to the C99, C++98, or Java 1.6 standards, we still ran into problems like teams submitting solutions with things like "void main()" in them which would not compile when using the C++98 or C99 standard with GCC/G++ but would work fine in Visual Studio. In cases like this, we did provide specific to help to teams, but for next year it would be nice to have a list of common things acceptable on Windows that aren't acceptable on Linux so we can immediately warn teams if they try to upload something like this.

<hr />

<strong>Conclusion &amp; Source</strong>

Hosting a programming competition is arguably more difficult than participating in one. This is especially true when you consider picking the problems such that a team can't search for a solution on Google. However, the lengths we went through in problem selection is another blog entry entirely.

<a href="https://github.com/shanet/CodePSU">The source is available on GitHub</a>.
