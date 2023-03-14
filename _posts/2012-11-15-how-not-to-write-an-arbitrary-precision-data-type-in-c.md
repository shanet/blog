---
layout: post
title: How NOT to write an arbitrary precision data type in C
date: 2012-11-15
---

This past weekend was <a href="https://www.hackerleague.org/hackathons/hackpsu">HackPSU</a>, a typical 24 hour hackathon at Penn State. Without any better idea, my friend, <a href="http://www.gageames.com/">Gage Ames</a> and I decided to break the mold of the typical hackathon projects of games, websites, and mobile apps, and doing something much more nerdy: creating our own arbitrary precision data type in C so we could calculate pi (or any other irrational number) to as many digits as our computers could handle.

About one year earlier I attempted the same project, but with even less success than this time around. My previous solution was to use very large arrays to store the digits of pi in. Obviously, allocating huge amounts of memory for this purpose was a bad idea. That, coupled with a general lack of experience with memory management in C++ led to a complete and utter failure. However, this time around, I tried to learn from these mistakes and took a different approach. After discussing it with Gage, we decided on using pure C rather than any other that fancy C++ stuff, and to use a linked list rather than an array to the store our data. Sounds good so far, but here's where we made our first fatal mistake. We originally would have liked to use a doubly-linked list as it would have made our adding algorithm simpler. At this stage, I was very concerned with using as little memory as possible though and using a doubly-linked list would have nearly doubled the memory needed to store a digit. As a small digression,  knowing that each digit in a node could not be greater than 9, we used a char to save 3 bytes over using a 4 byte integer for each digit. Then, we needed a pointer to the next digit in the list, which was 8 bytes (on our 64bit laptops). There's no getting around that, but a doubly-linked list would require another pointer to the previous digit, which was another 8 bytes. This brought the total memory needed for a digit to 17 bytes per digit for a doubly-linked list or 9 bytes per digit for a singly-linked list. After a little experimentation, we determined that our adding algorithm would work just fine with a singly-linked list if we represented the digits as the least significant digit at the head of the list. In short, a few hours later we realized that using a singly-linked list and representing the digits in what accounted to little endian was just too darn slow and tedious. But enough talk, let's look at this horribly flawed code.

<!--more-->

We decided to represent each number as a struct with pointers to head of two lists, the mantissa (<a href="http://en.wikipedia.org/wiki/Significand">technically not the correct usage</a> of this term, but close enough for our purposes), or the digits left of the decimal and the decimal part, or the digits right of the decimal. We called this data type "p_num" for "precise number". We then defined a digit struct which contained the char for the actual digit, and a pointer to the next digit in the list.

{% highlight c linenos %}
struct _digit {
    unsigned char num;
    struct _digit *next;
};

struct _p_num {
    struct _digit *man_h;
    struct _digit *dec_h;
};

typedef struct _digit digit;
typedef struct _p_num p_num;

{% endhighlight %}


Simple. Next would be the process of initializing one of these guys, but due to our decision to represent our numbers in little endian, the init function is unnecessarily complicated, but still interesting. In short, to init a p_num, you call the <code>init()</code> function with the mantissa and decimal parts as strings which are then parsed and converted to lists appropriately.

{% highlight c linenos %}
int init(p_num **num, char *man, char *dec) {
    if(*num == NULL) *num = malloc(sizeof(p_num));

    if(*num == NULL) return -1;

    digit *new_digit = NULL;
    digit *prev_digit = NULL;

    int i=0;
    while(man[i] != '\0') {
        new_digit = malloc(sizeof(digit));
        if(new_digit == NULL) return -1;

        new_digit->num = man[i] - '0';
        new_digit->next = prev_digit;
        prev_digit = new_digit;
        i++;
    }
    (*num)->man_h = new_digit;

    new_digit  = NULL;
    prev_digit = NULL;

    i = 0;
    while(dec[i] != '\0') {
        new_digit = malloc(sizeof(digit));
        if(new_digit == NULL) return -1;

        new_digit->num = dec[i] - '0';
        new_digit->next = prev_digit;
        prev_digit = new_digit;
        i++;
    }
    (*num)->dec_h = new_digit;

    return 0;
}

{% endhighlight %}

<hr />

More interesting is the add function. Or should I say functions since we ended up with three functions to add two p_num's together. Our algorithm is very naive, in that it adds numbers in base 10 just like you learned in elementary school. From a high level, the <code>add()</code> function is called with the two p_num's to be added. This function calls the <code>add_digits()</code> function which adds a given digit list together. Inside <code>add_digits()</code>, <code>add_with_carry()</code> is called which actually adds two given digits and returns a possible carry from the addition.  A major memory compromise we made here (and with all other arithmetic functions we wrote) was that we assumed that the first argument to be added would be modified with the result of the addition. The reason for this being that we did not want to create a copy of a potentially huge number. For our purposes, this was fine, but would not bode well for a more generic task. The full source is below, but these two functions are the more interesting parts of the functions needed for the complete addition algorithm.

{% highlight c linenos %}
int add_digits(p_num *left, p_num *right, int part, int carry) {
    fix_length(left, right, part);

    digit *cur_left  = (part == MAN) ? left->man_h : left->dec_h;
    digit *cur_right = (part == MAN) ? right->man_h : right->dec_h;
    digit *prev_left = NULL;

    while(cur_left != NULL || cur_right != NULL || carry) {
        if(cur_left != NULL && cur_right != NULL) {
            carry = add_with_carry(cur_left, cur_right, carry);

        } else if(cur_right != NULL) {
            cur_left = malloc(sizeof(digit));
            if(cur_left == NULL) {
                return -1;
            }

            carry = add_with_carry(cur_left, cur_right, carry);
            cur_left->next = NULL;
            prev_left->next = cur_left;

        } else if(cur_left != NULL && carry) {
            carry = add_with_carry(cur_left, NULL, carry);
        } else if(cur_left == NULL && cur_right == NULL && carry) {
            return carry;
        }

        prev_left = cur_left;
        if(cur_left  != NULL) cur_left  = cur_left->next;
        if(cur_right != NULL) cur_right = cur_right->next;
    }

    return 0;
}

int add_with_carry(digit *left, digit *right, int carry) {
    int right_num = (right != NULL) ? right->num : 0;

    int sum = left->num + right_num + carry;
    carry = (sum >= 10) ? 1 : 0;
    left->num = sum % 10;

    return carry;
}

{% endhighlight %}

<hr />

After addition, we had to tackle multiplication. Here's where another one of the big mistakes happened: To save time and effort, we decided to perform multiplication as repeated calls to the addition function. But this idea caused a problem because we couldn't multiply non-whole numbers this way. So instead we decided to move all the decimal digits to the left of the decimal point (move them into the mantissa list), do the multiplication, and then move those digits back to the right of the decimal (back into the decimal list).

Creative? Sure. Messy? Absolutely.

Granted, because we're working with linked lists, this process isn't too time consuming since it's just some iterating and moving pointers around. The full source of the shift functions are below. I'll skip them here. Below is the multiply function. Due to the nature of multiplying, we were forced to make a copy of one of the passed in p_num's which involves a confusing copy function which I'll also skip the finer details of since this isn't a post on manipulating pointers and list operations.


{% highlight c linenos %}
int mult(p_num *left, p_num *right) {
    p_num *shift_num = shift_full_right(right);
    p_num *i = NULL;
    p_num *one = NULL;

    init(&i, "1", "0");
    init(&one, "1", "0");

    p_num *orig_left;
    if(copy_p_num(left, &orig_left) == -1) return -1;

    while(compare(i, right) == -1) {
        if(add(left, orig_left) == -1) return -1;
        add(i, one);
    }

    shift_left(left, shift_num);
    shift_left(right, shift_num);

    return 0;
}

{% endhighlight %}

<hr />

Here's where things basically fell off a cliff: the exponentiation function.

Similar to multiplication, we took the shortcut of representing exponentiation as repeated multiplications. However, this time we had a problem that we couldn't perform exponentiation with non-integer powers. After looking at the formula for approximating pi we were shooting for, we realized that we wouldn't need to have non-integer powers, so we didn't account for it. This is still a huge limitation in the exponentiation function though. The real problem with the exponentiation function, though, is that is it <em>slow</em><em>. </em>I mean really, really slow. All the shortcuts were bound to catch up with us eventually, right? A little further down is the actual execution times for all these functions. I'll save the surprise (and laughter) for then.

{% highlight c linenos %}
int power(p_num *base, p_num *pow) {
    p_num *i = NULL;
    p_num *one = NULL;

    init(&i, "1", "0");
    init(&one, "1", "0");

    p_num *orig_base;
    if(copy_p_num(base, &orig_base) == -1) return -1;

    while(compare(i, pow) == -1) {
        if(mult(base, orig_base) == -1) return -1;
        add(i, one);
    }

    return 0;
}

{% endhighlight %}

After realizing how slow the exponentiation function was, and because, remember, this was a 24 hour hackathon and it was approaching the last third of the 24 hours, we were tired, frustrated, and just sick of working on this so we essentially dropped the project at this point... or at least for the time being. It would be nice to come back at take a new look at this whole thing with some fresh eyes.

The code above doesn't sell the whole story though. We had a bunch of other functions that needed written to make the above code work. Apart from the typical list operations such as appending to the head, appending to the tail and reversing the list, we had a comparison and copy list function. Even the print function was more complicated than I'm used to. To the print the list, we had to reverse it then print it out and finally, reverse it again so the list was back in the correct order used for the arithmetic functions. All in all, it was a ton of work for very little payoff. There should also be a free function, because as it stands, no memory is ever free'd leading to a whole slew of memory leaks, but that wasn't a high priority at the time.

The full source of all these functions are below, but first, let's take a look at just how slow this thing was.

Here's a simple main file that just adds two files. Timing is done with the built-in bash time command. To compile we used the <code>O3</code> flag in GCC, which does actually speed it up considerably compared to no optimization at all. The executable is appropriately called "irrational".


{% highlight c linenos %}
#include <stdio.h>
#include "p_num.h"

int main() {
    p_num *left = NULL;
    p_num *right = NULL;
    init(&left, "12345", "23");
    init(&right, "12", "42");

    add(left, right);

    print_p_num(left);

    return 0;
}

{% endhighlight %}

The add function executes in a pretty reasonable amount of time for some simple numbers.


{% highlight text linenos %}
$ time ./irrational
12357.65

real    0m0.001s
user    0m0.000s
sys     0m0.000s

{% endhighlight %}

It even works well when we use some very large, and very precise numbers, such as:

{% highlight c linenos %}
init(&left, "12345123451234512345123451234512345123451", "12345123451234512345123451234512345123451234512");
init(&right, "123451234512345123451234512345123451234512345", "1234512345123451234512345123451232345");

{% endhighlight %}



{% highlight text linenos %}
$ time ./irrational
123463579635796357963579635796357963579635796.24690246902469024690246902469024668573451234512

real    0m0.001s
user    0m0.000s
sys     0m0.000s

{% endhighlight %}

For the skeptics,<a href="http://www.wolframalpha.com/input/?i=12345123451234512345123451234512345123451.12345123451234512345123451234512345123451234512+%2B+123451234512345123451234512345123451234512345.1234512345123451234512345123451232345"> here's Wolfram's computation</a> since this number is obviously too precise for a regular calculator.

Multiplication also isn't too terrible, but does choke on large numbers. I'll stick with a simple case here.


{% highlight c linenos %}
#include <stdio.h>
#include "p_num.h"

int main() {
    p_num *left = NULL;
    p_num *right = NULL;
    init(&left, "123", "512");
    init(&right, "567", "4242");

    mult(left, right);

    print_p_num(left);

    return 0;
}

{% endhighlight %}


{% highlight text linenos %}
$ time ./irrational
70083.6977904

real    0m2.541s
user    0m2.536s
sys     0m0.004s

{% endhighlight %}

As you can see, this is starting to push it. 2.5 seconds is not an acceptable calculation time for something so simple. On the up side, my TI-84 calculator, gives a less precise answer for this case than this program does. Again, for verification, <a href="http://www.wolframalpha.com/input/?i=123.512+*+567.4242">Wolfram's computation</a>, which does handle the calculation with the same (probably better actually) precision that we do here.

Finally, exponentiation. Let's keep it very simple so the program finishes before next month.


{% highlight c linenos %}
#include <stdio.h>
#include "p_num.h"

int main() {
    p_num *left = NULL;
    p_num *right = NULL;
    init(&left, "2", "0");
    init(&right, "4", "0");

    power(left, right);

    print_p_num(left);

    return 0;
}

{% endhighlight %}


{% highlight text linenos %}
$ time ./irrational
256.00000000000000000000000000000

real    0m14.404s
user    0m14.401s
sys     0m0.000s

{% endhighlight %}

That's right, 14.5 seconds to calculate 2<sup>4</sup>. This obviously isn't scaling well. Sure, we could do some optimizations to make it faster, but it seems to me like a whole new approach is needed.

The next day, I resorted to libgmp, the <a href="http://gmplib.org/">GNU multiple precision library</a>, and lo and behold, I had pi calculated accurately to 10,000 places in a few hours. With some changes  in the approximation formula, I now have it calculating to 1.5 million digits in under 2 minutes, but that's the topic of another post entirely.

In conclusion, lessons learned:

* Don't try to write your own arbitrary precision data type and accompanying functions in fewer than 24 hours.
* There's a fine line between trading computation time for memory. Moderation is key.
* A singly-linked list is definitely the wrong implementation; a doubly-linked list probably isn't much better.

As promised, the full source.

p_num.h:

{% highlight c linenos %}
#include <stdio.h>
#include <stdlib.h>

#define MAN 1
#define DEC 2

struct _digit {
    unsigned char num;
    struct _digit *next;
};

struct _p_num {
    struct _digit *man_h;
    struct _digit *dec_h;
};

typedef struct _digit digit;
typedef struct _p_num p_num;

int init(p_num **num, char *man, char *dec);

int add(p_num *left, p_num *right);

int add_digits(p_num *left, p_num *right, int part, int carry);

int add_with_carry(digit *left, digit *right, int carry);

int mult(p_num *left, p_num *right);

int power(p_num *base, p_num *pow);

int compare(p_num *left, p_num *right);

int compare_digits(p_num *left, p_num *right, int part);

int fix_length(p_num *left, p_num *right, int part);

int append_to_head(p_num *num, int part, int data);

int append_to_tail(p_num *num, int part, int data);

p_num* shift_full_right(p_num *num);

int shift_left(p_num *num, p_num *shift_num);

int copy_p_num(p_num *num, p_num **copy);

int copy_list(digit *head, digit **copy_head);

void print_p_num(p_num *num);

digit* reverse_list(digit *head);

{% endhighlight %}


p_num.c:

{% highlight c linenos %}
#include "p_num.h"

int init(p_num **num, char *man, char *dec) {
    if(*num == NULL) *num = malloc(sizeof(p_num));

    if(*num == NULL) return -1;

    digit *new_digit = NULL;
    digit *prev_digit = NULL;

    int i=0;
    while(man[i] != '\0') {
        new_digit = malloc(sizeof(digit));
        if(new_digit == NULL) return -1;

        new_digit->num = man[i] - '0';
        new_digit->next = prev_digit;
        prev_digit = new_digit;
        i++;
    }
    (*num)->man_h = new_digit;

    new_digit  = NULL;
    prev_digit = NULL;

    i = 0;
    while(dec[i] != '\0') {
        new_digit = malloc(sizeof(digit));
        if(new_digit == NULL) return -1;

        new_digit->num = dec[i] - '0';
        new_digit->next = prev_digit;
        prev_digit = new_digit;
        i++;
    }
    (*num)->dec_h = new_digit;

    return 0;
}

int add(p_num *left, p_num *right) {
    int carry = add_digits(left, right, DEC, 0);
    if(carry == -1) return -1;

    carry = add_digits(left, right, MAN, carry);
    if(carry == -1) return -1;

    if(carry) {
        return append_to_tail(left, MAN, 1);
    }

    return 0;
}

int add_digits(p_num *left, p_num *right, int part, int carry) {
    fix_length(left, right, part);

    digit *cur_left  = (part == MAN) ? left->man_h : left->dec_h;
    digit *cur_right = (part == MAN) ? right->man_h : right->dec_h;
    digit *prev_left = NULL;

    while(cur_left != NULL || cur_right != NULL || carry) {
        if(cur_left != NULL && cur_right != NULL) {
            carry = add_with_carry(cur_left, cur_right, carry);

        } else if(cur_right != NULL) {
            cur_left = malloc(sizeof(digit));
            if(cur_left == NULL) {
                return -1;
            }

            carry = add_with_carry(cur_left, cur_right, carry);
            cur_left->next = NULL;
            prev_left->next = cur_left;

        } else if(cur_left != NULL && carry) {
            carry = add_with_carry(cur_left, NULL, carry);
        } else if(cur_left == NULL && cur_right == NULL && carry) {
            return carry;
        }

        prev_left = cur_left;
        if(cur_left  != NULL) cur_left  = cur_left->next;
        if(cur_right != NULL) cur_right = cur_right->next;
    }

    return 0;
}

int add_with_carry(digit *left, digit *right, int carry) {
    int right_num = (right != NULL) ? right->num : 0;

    int sum = left->num + right_num + carry;
    carry = (sum >= 10) ? 1 : 0;
    left->num = sum % 10;

    return carry;
}

int mult(p_num *left, p_num *right) {
    p_num *shift_num = shift_full_right(right);
    p_num *i = NULL;
    p_num *one = NULL;

    init(&i, "1", "0");
    init(&one, "1", "0");

    p_num *orig_left;
    if(copy_p_num(left, &orig_left) == -1) return -1;

    while(compare(i, right) == -1) {
        if(add(left, orig_left) == -1) return -1;
        add(i, one);
    }

    shift_left(left, shift_num);
    shift_left(right, shift_num);

    return 0;
}

int power(p_num *base, p_num *pow) {
    p_num *i = NULL;
    p_num *one = NULL;

    init(&i, "1", "0");
    init(&one, "1", "0");

    p_num *orig_base;
    if(copy_p_num(base, &orig_base) == -1) return -1;

    while(compare(i, pow) == -1) {
        if(mult(base, orig_base) == -1) return -1;
        add(i, one);
    }

    return 0;
}

int compare(p_num *left, p_num *right) {
    int result = compare_digits(left, right, MAN);

    if (result == 0) {
        result = compare_digits(left, right, DEC);
    }

    return result;
}

int compare_digits(p_num *left, p_num *right, int part) {
    if(left == right) return 0;

    fix_length(left, right, part);

    digit *cur_left  = (part == MAN) ? reverse_list(left->man_h) : reverse_list(left->dec_h);
    digit *cur_right = (part == MAN) ? reverse_list(right->man_h) : reverse_list(right->dec_h);

    if(part == MAN) {
        left->man_h  = cur_left;
        right->man_h = cur_right;
    } else {
        left->dec_h  = cur_left;
        right->dec_h = cur_right;
    }

    int ret = 2;
    while(cur_left != NULL && cur_right != NULL) {
        if(cur_left->num > cur_right->num) {
            ret = 1;
            break;
        } else if(cur_left->num < cur_right->num) {
            ret = -1;
            break;
        }

        if(cur_left  != NULL) cur_left  = cur_left->next;
        if(cur_right != NULL) cur_right = cur_right->next;
    }

    if(ret == 2) {
        if(cur_left != NULL) {
            ret = 1;
        } else if(cur_right != NULL) {
            ret =  -1;
        } else {
            ret = 0;
        }
    }

    cur_left  = ((part == MAN) ? reverse_list(left->man_h) : reverse_list(left->dec_h));
    cur_right = ((part == MAN) ? reverse_list(right->man_h) : reverse_list(right->dec_h));

    if(part == MAN) {
        left->man_h  = cur_left;
        right->man_h = cur_right;
    } else {
        left->dec_h  = cur_left;
        right->dec_h = cur_right;
    }

    return ret;
}

int fix_length(p_num *left, p_num *right, int part) {
    digit *cur_left  = (part == MAN) ? left->man_h : left->dec_h;
    digit *cur_right = (part == MAN) ? right->man_h : right->dec_h;

    while(cur_left != NULL || cur_right != NULL) {
        if(cur_left == NULL) {
            ((part == MAN) ? append_to_tail(left, part, 0) : append_to_head(left, part, 0));
        } else if(cur_right == NULL) {
            ((part == MAN) ? append_to_tail(right, part, 0) : append_to_head(right, part, 0));
        }

        if(cur_left  != NULL) cur_left  = cur_left->next;
        if(cur_right != NULL) cur_right = cur_right->next;
    }

    return 0;
}

int append_to_head(p_num *num, int part, int data) {
    digit *new = malloc(sizeof(digit));
    if(new == NULL) return -1;

    if(part == MAN) {
        new->next = num->man_h;
        new->num  = data;
        num->man_h = new;
    } else if(part == DEC) {
        new->next = num->dec_h;
        new->num  = data;
        num->dec_h = new;
    }

    return 0;
}

int append_to_tail(p_num *num, int part, int data) {
    digit *new = malloc(sizeof(digit));
    if(new == NULL) return -1;

    digit *list = (part == MAN) ? num->man_h : num->dec_h;
    digit *cur = list;

    while(cur->next != NULL) {
        cur = cur->next;
    }

    cur->next = new;
    new->next = NULL;
    new->num = data;

    return 0;
}

p_num* shift_full_right(p_num *num) {
    digit *tmp = num->man_h;
    num->man_h = num->dec_h;

    //digit *new = malloc(sizeof(digit));
    //if(new == NULL) return NULL;
    //new->num = 0;
    //new->next = NULL;
    //num->dec_h = new;
    num->dec_h = NULL;

    p_num *shift_num = NULL;
    p_num *one = NULL;
    init(&shift_num, "0", "0");
    init(&one, "1", "0");

    digit *cur = num->man_h;
    while(cur->next != NULL) {
        cur = cur->next;
        add(shift_num, one);
    }
    add(shift_num, one);
    cur->next = tmp;

    return shift_num;
}

int shift_left(p_num *num, p_num *shift_num) {
    digit *cur = num->man_h;
    digit *prev = NULL;

    p_num *i = NULL;
    p_num *one = NULL;
    init(&i, "0", "0");
    init(&one, "1", "0");

    while(compare(i, shift_num) == -1) {
        prev = cur;
        cur = cur->next;
        add(i, one);
    }
    prev->next = NULL;

    digit *dec_tail = num->dec_h;
    if(dec_tail == NULL) {
        num->dec_h = num->man_h;
    } else {
        while(dec_tail->next != NULL) {
            dec_tail = dec_tail->next;
        }
        dec_tail->next = num->man_h;
    }

    num->man_h = cur;

    return 0;
}

int copy_p_num(p_num *num, p_num **copy) {
    *copy = malloc(sizeof(p_num));
    if(copy == NULL) return -1;
    (*copy)->man_h = NULL;
    (*copy)->dec_h = NULL;

    if(copy_list(num->man_h, &((*copy)->man_h)) == -1) return -1;
    if(copy_list(num->dec_h, &((*copy)->dec_h)) == -1) return -1;

    return 0;
}

int copy_list(digit *head, digit **copy_head) {
    digit *cur = head;
    digit *prev = NULL;
    digit *new;
    int first = 1;

    while(cur != NULL) {
        new = malloc(sizeof(digit));
        if(new == NULL) return -1;
        if(first) {
            (*copy_head) = new;
            first = 0;
        } else {
            prev->next = new;
        }

        new->next = NULL;
        new->num = cur->num;

        prev = new;
        cur = cur->next;
    }

    return 0;
}

void print_p_num(p_num *num) {
    num->man_h = reverse_list(num->man_h);
    num->dec_h = reverse_list(num->dec_h);

    digit *cur = num->man_h;
    while(cur != NULL) {
        printf("%d", cur->num);
        cur = cur->next;
    }

    printf(".");

    cur = num->dec_h;
    while(cur != NULL) {
        printf("%d", cur->num);
        cur = cur->next;
    }

    printf("\n");

    num->man_h = reverse_list(num->man_h);
    num->dec_h = reverse_list(num->dec_h);
}

digit* reverse_list(digit *head) {
    digit *prev = NULL;
    digit *cur  = head;
    digit *tmp  = NULL;

    while(cur != NULL) {
        tmp = cur->next;
        cur->next = prev;
        prev = cur;
        cur = tmp;
    }

    return prev;
}

{% endhighlight %}


Last but not least, a super small Makefile:

{% highlight makefile linenos %}
all:
	gcc -std=c99 -Wall -Wextra -O3 -o irrational main.c p_num.c

{% endhighlight %}

