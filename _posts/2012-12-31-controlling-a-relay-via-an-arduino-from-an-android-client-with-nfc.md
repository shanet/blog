---
layout: post
title: Controlling a relay via an Arduino from an Android client with NFC
date: 2012-12-31
---

Over the past few weeks I've been working on a small project that allows me to control electrical relays from an Arduino over the network from Android and C clients. It's been delayed slightly from finals, holidays and power outages thanks to snow storms, but below is a demo of the first complete version.

<a href="https://github.com/shanet/RelayRemote"><strong>Looking for the source code or instructions on how to set up your own?</strong></a>

<div class="page-center">
  <iframe src="https://www.youtube-nocookie.com/embed/Dhp8Tu2QPAA?rel=0" height="315" width="560" allowfullscreen="" frameborder="0"></iframe>
</div>

The whole project aims to be as simple as possible. As can be seen in the demo video above, the hardware setup consists of an Arduino Uno, Arduino ethernet shield, PowerSwitch Tail II relay, two wires connecting the relay to the Arduino, and power and ethernet for the Arduino.

<!--more-->

The protocol for communicating with the server is extremely short. In fact, it consists of two commands, one of which has further options.

* GET operation: Just send a <code>g</code> to the server and it responds with the state of pins 2-9 in the form <code>2-0;3-1;4-0;</code> etc. where the first number is the pin and the second number is whether the pin is on or off.
* SET operation: Turns a relay on/off. Of the form <code>s-[pin]-[cmd]</code> where <code>[pin]</code> is the pin to perform the command on and the command is either: <code>0</code> for off, <code>1</code> for on, or <code>t</code> for toggle.

The code for the GET operation is simply:

{% highlight c++ linenos %}
int op_get(EthernetClient client) {
   // Create a string with the status of each pin
   char status[34];
   char append[5];
   status[0] = '\0';

   for(int i=2; i<=9; i++) {
      sprintf(append, "%c-%c;", i+48, (digitalRead(i) == HIGH) ? '1' : '0');
      strncat(status, append, 4);
   }

   // Add a final newline and move the nul
   status[32] = '\n';
   status[33] = '\0';

   // Send the status string to the client
   client.print(status);

   return SUCCESS;
}

{% endhighlight %}

Just loop through the pins, check the state using <code>digitalRead()</code>, append each pin to the final string to send to the client and then send the data to the client.

The SET operation is just as simple.

{% highlight c++ linenos %}
// Convert pin to an int
pin -= 48;

switch(cmd) {
  // Turn relay off
  case '0':
     digitalWrite(pin, LOW);
     client.println(OK);
     break;
  // Turn relay on
  case '1':
     digitalWrite(pin, HIGH);
     client.println(OK);
     break;
  // Toggle relay state
  case 't':
  case 'T':
     (digitalRead(pin) == HIGH) ? digitalWrite(pin, LOW) : digitalWrite(pin, HIGH);
     client.println(OK);
     break;
  // Unexpected data from client
  default:
     abort_client(client);
     return FAILURE;
}

{% endhighlight %}

Omitting some of code that reads and parses the data sent to the server (it's boring), we first convert the pin to an int by just subtracting 48 since the data from the client is a string so a single character from that is a char and the max allowed pin is 9 so it's always guaranteed to be one decimal long.

After this it's just a switch to determine what command to perform using the <code>digitalWrite()</code> function. If a toggle command, we first check the state of the pin and then set it to the opposite state. The reply to the client is just either <code>OK</code> or <code>ERR</code>.

Full code for the Arduino server is below, but the most recent version will be on GitHub at the link at the top of this post.

{% highlight c++ linenos %}
#include <SPI.h>
#include <Ethernet.h>

#define PORT 2424
#define OK   "OK"
#define ERR  "ERR"

#define SUCCESS 0
#define FAILURE -1

// IMPORTANT: The IP AND MAC MUST BE CHANGED to something unique for each Arduino.
// The gateway will probably need changed as well.
byte ip[]      = {10, 10, 10, 31};
byte mac[]     = {0xDE, 0xAD, 0xBE, 0xEF, 0xFE, 0xEE};
byte gateway[] = {10, 10, 10, 1};
byte subnet[]  = {255, 255, 255, 0};

EthernetServer server = EthernetServer(PORT);

void setup() {
   // Set the relay pins as output
   for(int i=2; i<=9; i++) {
      pinMode(i, OUTPUT);
   }

   // Start the server
   Ethernet.begin(mac, ip, gateway, subnet);
   server.begin();
}

void loop() {
   // The client should be sending one of two commands.
   // GET: Of the form "g". Tells us to send back the status of each pin
   // SET: Of the form "s-[pin]-[state]". Tells us to set [pin] to [state]
   //      Pin should be any pin in [2,9]
   //      State is either 0 (off), 1 (on), or t (toggle)
   char op;

   // Get a client from the server
   EthernetClient client = server.available();

   if(client) {
      if(client.available()) {
         // Read the operation
         op = client.read();

         switch(op) {
            // Get status operation
            case 'g':
               op_get(client);
               break;
            // Set pin operation
            case 's':
               if(op_set(client) == FAILURE) return;
               break;
            default:
               abort_client(client);
               return;
         }
      }

      // We're done with this client. Disconnect it.
      client.stop();
   }
}

int op_set(EthernetClient client) {
   char pin;
   char cmd;

   // Read and ignore the hypen seperator
   if(client.read() != '-') {
      abort_client(client);
      return FAILURE;
   }

   // Read the pin
   if((pin = client.read()) == -1) {
      abort_client(client);
      return FAILURE;
   }

   // Check that the pin is in the valid range
   if(pin-48 < 2 || pin-48 > 9) {
      abort_client(client);
      return FAILURE;
   }

   // Read and ignore the hypen separator
   if(client.read() != '-') {
      abort_client(client);
      return FAILURE;
   }

   // Read the command to perform
   if((cmd = client.read()) == -1) {
      abort_client(client);
      return FAILURE;
   }

   // Convert pin to an int
   pin -= 48;

   switch(cmd) {
      // Turn relay off
      case '0':
         digitalWrite(pin, LOW);
         client.println(OK);
         break;
      // Turn relay on
      case '1':
         digitalWrite(pin, HIGH);
         client.println(OK);
         break;
      // Toggle relay state
      case 't':
      case 'T':
         (digitalRead(pin) == HIGH) ? digitalWrite(pin, LOW) : digitalWrite(pin, HIGH);
         client.println(OK);
         break;
      // Unexpected data from client
      default:
         abort_client(client);
         return FAILURE;
   }

   return SUCCESS;
}

int op_get(EthernetClient client) {
   // Create a string with the status of each pin
   char status[34];
   char append[5];
   status[0] = '\0';

   for(int i=2; i<=9; i++) {
      sprintf(append, "%c-%c;", i+48, (digitalRead(i) == HIGH) ? '1' : '0');
      strncat(status, append, 4);
   }

   // Add a final newline and move the nul
   status[32] = '\n';
   status[33] = '\0';

   // Send the status string to the client
   client.print(status);

   return SUCCESS;
}

void abort_client(EthernetClient client) {
   client.println(ERR);
   client.stop();
}

{% endhighlight %}
