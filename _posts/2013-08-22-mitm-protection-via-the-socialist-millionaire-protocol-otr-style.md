---
layout: post
title: MITM Protection via the Socialist Millionaire Protocol (OTR-style)
date: 2013-08-22
---

<strong>Crypto disclaimer!  I am NOT a crypto expert. Don't take the information here as 100% correct; you should verify it yourself. </strong><a href="http://happybearsoftware.com/you-are-dangerously-bad-at-cryptography.html">You are dangerously bad at crypto.</a>

<hr />

<strong>The problem</strong>

Man-in-the-middle attacks are a serious problem when designing any cryptographic protocol. Without using a PKI, a common solution is to provide users' with the fingerprint of exchanged public keys which they should then verify with the other party via another secure channel to ensure there is no MITM. In practice, this is a very poor solution because most users will not check fingeprints and even if they do, they may only compare the first and last few digits of the fingerprint meaning an attacker only need create a public key with the same few first and last digits of the public key they are trying to impersonate.

<strong>The solution</strong>

There's no good protection from MITM, but there is a way to exchange secrets without worrying about a MITM without using a PKI and without checking fingerprints. <a href="https://en.wikipedia.org/wiki/Off-the-Record_Messaging">OTR (off-the-record) messaging</a> utilizes the <a href="https://en.wikipedia.org/wiki/Socialist_millionaire">Socialist Millionaires Protocol</a>. In a (very small) nutshell, SMP allows two parties to check if a secret they both hold are equal to one another without revealing the actual secret to one another (or anyone else). If the secrets are not equal, no other information is revealed except that the secrets are not equal. Because of this, a would-be MITM attacker cannot interfere with the SMP, except to make it fail, because the secret value is never exchanged by the two parties.

<strong>How does it work?</strong>

As usual, the Wikipedia article on SMP drowns the reader with difficult to read math and does a poor job explaining the basic principle behind SMP. Luckily, there are <a href="http://twistedoakstudios.com/blog/Post3724_explain-it-like-im-five-the-socialist-millionaire-problem-and-secure-multi-party-computation">much better explanations out there</a>. The actual implementation of it is, unfortunately, just as convoluted as the math. The full implementation details can be found in the <a href="http://www.cypherpunks.ca/otr/Protocol-v3-4.0.0.html">OTR protocol 3 spec under the SMP section</a>. Below is the basic implementation of the protocol as defined in OTR version 3:

<!--more-->
<ul>
<li>Alice:
<ol>
<li>Picks random exponents a<sub>2</sub> and a<sub>3</sub></li>
<li>Sends Bob g<sub>2a</sub> = g<sub>1</sub><sup>a<sub>2</sub></sup> and g<sub>3a</sub> = g<sub>1</sub><sup>a<sub>3</sub></sup></li>
</ol>
</li>
<li>Bob:
<ol>
<li>Picks random exponents b<sub>2</sub> and b<sub>3</sub></li>
<li>Computes g<sub>2b</sub> = g<sub>1</sub><sup>b<sub>2</sub></sup> and g<sub>3b</sub> = g<sub>1</sub><sup>b<sub>3</sub></sup></li>
<li>Computes g<sub>2</sub> = g<sub>2a</sub><sup>b<sub>2</sub></sup> and g<sub>3</sub> = g<sub>3a</sub><sup>b<sub>3</sub></sup></li>
<li>Picks random exponent r</li>
<li>Computes P<sub>b</sub> = g<sub>3</sub><sup>r</sup> and Q<sub>b</sub> = g<sub>1</sub><sup>r</sup> g<sub>2</sub><sup>y</sup></li>
<li>Sends Alice g<sub>2b</sub>, g<sub>3b</sub>, P<sub>b</sub> and Q<sub>b</sub></li>
</ol>
</li>
<li>Alice:
<ol>
<li>Computes g<sub>2</sub> = g<sub>2b</sub><sup>a<sub>2</sub></sup> and g<sub>3</sub> = g<sub>3b</sub><sup>a<sub>3</sub></sup></li>
<li>Picks random exponent s</li>
<li>Computes P<sub>a</sub> = g<sub>3</sub><sup>s</sup> and Q<sub>a</sub> = g<sub>1</sub><sup>s</sup> g<sub>2</sub><sup>x</sup></li>
<li>Computes R<sub>a</sub> = (Q<sub>a</sub> / Q<sub>b</sub>) <sup>a<sub>3</sub></sup></li>
<li>Sends Bob P<sub>a</sub>, Q<sub>a</sub> and R<sub>a</sub></li>
</ol>
</li>
<li>Bob:
<ol>
<li>Computes R<sub>b</sub> = (Q<sub>a</sub> / Q<sub>b</sub>) <sup>b<sub>3</sub></sup></li>
<li>Computes R<sub>ab</sub> = R<sub>a</sub><sup>b<sub>3</sub></sup></li>
<li>Checks whether R<sub>ab</sub> == (P<sub>a</sub> / P<sub>b</sub>)</li>
<li>Sends Alice R<sub>b</sub></li>
</ol>
</li>
<li>Alice:
<ol>
<li>Computes R<sub>ab</sub> = R<sub>b</sub><sup>a<sub>3</sub></sup></li>
<li>Checks whether R<sub>ab</sub> == (P<sub>a</sub> / P<sub>b</sub>)</li>
</ol>
</li>
</ul>

But that's not all! There's also data integrity checks each step of the way, but I will defer to the OTR spec as those are just as, if not more, complicated than the basic protocol outlined above.

<strong>Show me the code already!</strong>

Hold your horses. First, <strong>my implementation is not meant to adhere to the OTR protocol 100%</strong>. It's pretty close, but I intend for this to be merged into my own project and used as an example here. If you want an OTR implementation, <a href="http://sourceforge.net/p/otr/libotr/ci/master/tree/">look elsewhere</a>. If you're looking for a simple example of exchanging a secret over a network and then checking if that secret was transmitted securely, read on.

Below is a Python implementation of SMP as defined by the OTR spec (somewhat, it's not exactly OTR). The test program asks for a shared secret and then checks that both secrets are the same with SMP. One final disclaimer, <strong>the test program is intended for demonstration purposes only. Never do socket programming like this in a production environment!</strong>

smp.py:

{% highlight python linenos=table %}
import hashlib
import os
import random
import struct

class SMP(object):
    def __init__(self, secret=None):
        # Note: This constant is split up onto multiple lines to preserve the formatting on my blog.
        # It's necessary to put it all on a single line or you'll get a syntax error.
        self.mod = 24103124269210325885520760221975660748569505485024599426541169419581088316826122
288900938582613416146732271414779040121965036489570505826319427307068050092230627347453410734066962
460145893616597740410271692494532003787294341703258437786591981437631937768598695240889401955773461
198435453015470437472077499697637500843089263392955599688824578724129938101291302945929999479263652
64059284647209730384947211681434464714438488520940127459844288859336526896320919633919
        self.modOrder = (self.mod-1) / 2
        self.gen = 2
        self.match = False

        if type(secret) is str:
            # Encode the string as a hex value
            self.secret = int(secret.encode('hex'), 16)
        elif type(secret) is int or type(secret) is long:
            self.secret = secret
        else:
            raise TypeError("Secret must be an int or a string. Got type: " + str(type(secret)))

    def step1(self):
        self.x2 = createRandomExponent()
        self.x3 = createRandomExponent()

        self.g2 = pow(self.gen, self.x2, self.mod)
        self.g3 = pow(self.gen, self.x3, self.mod)

        (c1, d1) = self.createLogProof('1', self.x2)
        (c2, d2) = self.createLogProof('2', self.x3)

        # Send g2a, g3a, c1, d1, c2, d2
        return packList(self.g2, self.g3, c1, d1, c2, d2)

    def step2(self, buffer):
        (g2a, g3a, c1, d1, c2, d2) = unpackList(buffer)

        if not self.isValidArgument(g2a) or not self.isValidArgument(g3a):
            raise ValueError("Invalid g2a/g3a values")

        if not self.checkLogProof('1', g2a, c1, d1):
            raise ValueError("Proof 1 check failed")

        if not self.checkLogProof('2', g3a, c2, d2):
            raise ValueError("Proof 2 check failed")

        self.g2a = g2a
        self.g3a = g3a

        self.x2 = createRandomExponent()
        self.x3 = createRandomExponent()

        r = createRandomExponent()

        self.g2 = pow(self.gen, self.x2, self.mod)
        self.g3 = pow(self.gen, self.x3, self.mod)

        (c3, d3) = self.createLogProof('3', self.x2)
        (c4, d4) = self.createLogProof('4', self.x3)

        self.gb2 = pow(self.g2a, self.x2, self.mod)
        self.gb3 = pow(self.g3a, self.x3, self.mod)

        self.pb = pow(self.gb3, r, self.mod)
        self.qb = mulm(pow(self.gen, r, self.mod), pow(self.gb2, self.secret, self.mod), self.mod)

        (c5, d5, d6) = self.createCoordsProof('5', self.gb2, self.gb3, r)

        # Sends g2b, g3b, pb, qb, all the c's and d's
        return packList(self.g2, self.g3, self.pb, self.qb, c3, d3, c4, d4, c5, d5, d6)

    def step3(self, buffer):
        (g2b, g3b, pb, qb, c3, d3, c4, d4, c5, d5, d6) = unpackList(buffer)

        if not self.isValidArgument(g2b) or not self.isValidArgument(g3b) or \
           not self.isValidArgument(pb) or not self.isValidArgument(qb):
            raise ValueError("Invalid g2b/g3b/pb/qb values")

        if not self.checkLogProof('3', g2b, c3, d3):
            raise ValueError("Proof 3 check failed")

        if not self.checkLogProof('4', g3b, c4, d4):
            raise ValueError("Proof 4 check failed")

        self.g2b = g2b
        self.g3b = g3b

        self.ga2 = pow(self.g2b, self.x2, self.mod)
        self.ga3 = pow(self.g3b, self.x3, self.mod)

        if not self.checkCoordsProof('5', c5, d5, d6, self.ga2, self.ga3, pb, qb):
            raise ValueError("Proof 5 check failed")

        s = createRandomExponent()

        self.qb = qb
        self.pb = pb
        self.pa = pow(self.ga3, s, self.mod)
        self.qa = mulm(pow(self.gen, s, self.mod), pow(self.ga2, self.secret, self.mod), self.mod)

        (c6, d7, d8) = self.createCoordsProof('6', self.ga2, self.ga3, s)

        inv = self.invm(qb)
        self.ra = pow(mulm(self.qa, inv, self.mod), self.x3, self.mod)

        (c7, d9) = self.createEqualLogsProof('7', self.qa, inv, self.x3)

        # Sends pa, qa, ra, c6, d7, d8, c7, d9
        return packList(self.pa, self.qa, self.ra, c6, d7, d8, c7, d9)

    def step4(self, buffer):
        (pa, qa, ra, c6, d7, d8, c7, d9) = unpackList(buffer)

        if not self.isValidArgument(pa) or not self.isValidArgument(qa) or not self.isValidArgument(ra):
            raise ValueError("Invalid pa/qa/ra values")

        if not self.checkCoordsProof('6', c6, d7, d8, self.gb2, self.gb3, pa, qa):
            raise ValueError("Proof 6 check failed")

        if not self.checkEqualLogs('7', c7, d9, self.g3a, mulm(qa, self.invm(self.qb), self.mod), ra):
            raise ValueError("Proof 7 check failed")

        inv = self.invm(self.qb)
        rb = pow(mulm(qa, inv, self.mod), self.x3, self.mod)

        (c8, d10) = self.createEqualLogsProof('8', qa, inv, self.x3)

        rab = pow(ra, self.x3, self.mod)

        inv = self.invm(self.pb)
        if rab == mulm(pa, inv, self.mod):
            self.match = True

        # Send rb, c8, d10
        return packList(rb, c8, d10)

    def step5(self, buffer):
        (rb, c8, d10) = unpackList(buffer)

        if not self.isValidArgument(rb):
            raise ValueError("Invalid rb values")

        if not self.checkEqualLogs('8', c8, d10, self.g3b, mulm(self.qa, self.invm(self.qb), self.mod), rb):
            raise ValueError("Proof 8 check failed")

        rab = pow(rb, self.x3, self.mod)

        inv = self.invm(self.pb)
        if rab == mulm(self.pa, inv, self.mod):
            self.match = True

    def createLogProof(self, version, x):
        randExponent = createRandomExponent()
        c = sha256(version + str(pow(self.gen, randExponent, self.mod)))
        d = (randExponent - mulm(x, c, self.modOrder)) % self.modOrder
        return (c, d)

    def checkLogProof(self, version, g, c, d):
        gd = pow(self.gen, d, self.mod)
        gc = pow(g, c, self.mod)
        gdgc = gd * gc % self.mod
        return (sha256(version + str(gdgc)) == c)

    def createCoordsProof(self, version, g2, g3, r):
        r1 = createRandomExponent()
        r2 = createRandomExponent()

        tmp1 = pow(g3, r1, self.mod)
        tmp2 = mulm(pow(self.gen, r1, self.mod), pow(g2, r2, self.mod), self.mod)

        c = sha256(version + str(tmp1) + str(tmp2))

        # TODO: make a subm function
        d1 = (r1 - mulm(r, c, self.modOrder)) % self.modOrder
        d2 = (r2 - mulm(self.secret, c, self.modOrder)) % self.modOrder

        return (c, d1, d2)

    def checkCoordsProof(self, version, c, d1, d2, g2, g3, p, q):
        tmp1 = mulm(pow(g3, d1, self.mod), pow(p, c, self.mod), self.mod)

        tmp2 = mulm(mulm(pow(self.gen, d1, self.mod), pow(g2, d2, self.mod), self.mod), pow(q, c, self.mod), self.mod)

        cprime = sha256(version + str(tmp1) + str(tmp2))

        return (c == cprime)

    def createEqualLogsProof(self, version, qa, qb, x):
        r = createRandomExponent()
        tmp1 = pow(self.gen, r, self.mod)
        qab = mulm(qa, qb, self.mod)
        tmp2 = pow(qab, r, self.mod)

        c = sha256(version + str(tmp1) + str(tmp2))
        tmp1 = mulm(x, c, self.modOrder)
        d = (r - tmp1) % self.modOrder

        return (c, d)

    def checkEqualLogs(self, version, c, d, g3, qab, r):
        tmp1 = mulm(pow(self.gen, d, self.mod), pow(g3, c, self.mod), self.mod)

        tmp2 = mulm(pow(qab, d, self.mod), pow(r, c, self.mod), self.mod)

        cprime = sha256(version + str(tmp1) + str(tmp2))
        return (c == cprime)

    def invm(self, x):
        return pow(x, self.mod-2, self.mod)

    def isValidArgument(self, val):
        return (val >= 2 and val <= self.mod-2)

def packList(*items):
    buffer = ''

    # For each item in the list, convert it to a byte string and add its length as a prefix
    for item in items:
        bytes = longToBytes(item)
        buffer += struct.pack('!I', len(bytes)) + bytes

    return buffer

def unpackList(buffer):
    items = []

    index = 0
    while index < len(buffer):
        # Get the length of the long (4 byte int before the actual long)
        length = struct.unpack('!I', buffer[index:index+4])[0]
        index += 4

        # Convert the data back to a long and add it to the list
        item = bytesToLong(buffer[index:index+length])
        items.append(item)
        index += length

    return items

def bytesToLong(bytes):
    length = len(bytes)
    string = 0
    for i in range(length):
        string += byteToLong(bytes[i:i+1]) << 8*(length-i-1)
    return string

def longToBytes(long):
    bytes = ''
    while long != 0:
        bytes = longToByte(long & 0xff) + bytes
        long >>= 8
    return bytes

def byteToLong(byte):
    return struct.unpack('B', byte)[0]

def longToByte(long):
    return struct.pack('B', long)

def mulm(x, y, mod):
    return x * y % mod

def createRandomExponent():
    return random.getrandbits(192*8)

def sha256(message):
    return long(hashlib.sha256(str(message)).hexdigest(), 16)

{% endhighlight %}

smpTest.py:

{% highlight python linenos=table %}
import smp
import socket
import sys
import M2Crypto

# Check command line args
if len(sys.argv) != 2:
    print "Usage: %s [IP/listen]" % sys.argv[0]
    sys.exit(1)

sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

if sys.argv[1] == 'listen':
    # Listen for incoming connections
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.bind(('0.0.0.0', 5000))
    sock.listen(1)
    print "Listening for client"
    client = sock.accept()[0]

    # Prompt the user for a shared secret to use in SMP
    secret = raw_input("Enter shared secret: ")

    # Create an SMP object with the calculated secret
    smp = smp.SMP(secret)

    # Do the SMP protocol
    buffer = client.recv(4096)
    buffer = smp.step2(buffer)
    client.send(buffer)

    buffer = client.recv(4096)
    buffer = smp.step4(buffer)
    client.send(buffer)
else:
    # Connect to the server
    sock.connect((sys.argv[1], 5000))

    # Prompt the user for a shared secret to use in SMP
    secret = raw_input("Enter shared secret: ")

    # Create an SMP object with the calculated secret
    smp = smp.SMP(secret)

    # Do the SMP protocol
    buffer = smp.step1()
    sock.send(buffer)

    buffer = sock.recv(4096)
    buffer = smp.step3(buffer)
    sock.send(buffer)

    buffer = sock.recv(4096)
    smp.step5(buffer)

# Check if the secrets match
if smp.match:
    print "Secrets match"
else:
    print "Secrets do not match"

{% endhighlight %}

To use it, run one instance as a server and another as a client. Such as:

{% highlight text linenos=table %}
$ python smpTest.py listen
$ python smpTest.py localhost # In another terminal

{% endhighlight %}

If everything went well, you should see output similar to:

{% highlight text linenos=table %}
$ python smpTest.py listen
Listening for client
Enter shared secret: biscuits
Secrets match

{% endhighlight %}



{% highlight text linenos=table %}
$ python smpTest.py localhost
Enter shared secret: biscuits
Secrets match

{% endhighlight %}

