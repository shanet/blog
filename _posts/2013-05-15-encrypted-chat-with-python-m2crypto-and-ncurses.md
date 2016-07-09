---
layout: post
title: Encrypted chat with Python, M2Crypto, and NCurses
date: 2013-05-15
---

A couple of weeks ago I realized that there isn't a simple way to communicate with someone over a strongly encrypted channel without going through an intermediary server when at least one of the parties is not a very technically minded person (there probably is such a such a thing, but I don't know of it). I wanted to be able to perform basic chat with someone that doesn't know anything about cryptography and do it without having both people connect to a server. Rather, I wanted a simple server that I ran and sent a friend a simple binary that would ask the hostname of my server and we could chat securely.

Enter my new project, <a title="The code!" href="https://github.com/shanet/Cryptully">Cryptully</a>. It's a simple Python application that allows for AES encrypted chat for people that don't know anything about crypto. As of the time of this writing, the project is at its first milestone. That is, it has a basic Curses UI with asynchronous chat and, of course, everything is encrypted.

The project is pretty straightforward right now, but let's look at the a few components. First, the crypto functions that encrypt and decrypt data between the server and client with AES.

{% highlight python linenos %}
def generateKeys(self, bits=2048):
    # Generate the keypair (65537 as the public exponent)
    self.localKeypair = M2Crypto.RSA.gen_key(bits, 65537, self.__callback)

    # Generate the AES key and IV
    self.aesKey  = M2Crypto.Rand.rand_bytes(32)
    self.aesIv   = M2Crypto.Rand.rand_bytes(32)
    self.aesSalt = M2Crypto.Rand.rand_bytes(8)

{% endhighlight %}

The generate keys function is generates an RSA keypair using the M2Crypto RSA key generation function. Then, it generates a 256bit AES key by pulling 32 bytes from the kernel's urandom source. The same process is done for the IV and salt (except the salt is only 8 bytes).

<!--more-->

The RSA encryption and decryption functions are very simple. Since this is intended to encrypt data between a client and server, I only needed to implement a function to encrypt data with a public key and decrypt it with a private key.

{% highlight python linenos %}
def rsaEncrypt(self, message):
    self.__checkRemoteKeypair()
    try:
        return self.remoteKeypair.public_encrypt(message, M2Crypto.RSA.pkcs1_oaep_padding)
    except M2Crypto.RSA.RSAError as rsae:
        raise CryptoError(str(rsae))

def rsaDecrypt(self, message):
    self.__checkLocalKeypair()
    try:
        return self.localKeypair.private_decrypt(message, M2Crypto.RSA.pkcs1_oaep_padding)
    except M2Crypto.RSA.RSAError as rsae:
        raise CryptoError(str(rsae))

{% endhighlight %}

Essentially, these function just call M2Crypto's <code>public_encrypt</code> and <code>private_decrypt</code> functions with the given message to encrypt/decrypt and the padding type to use.

The AES functions are slightly different than the RSA functions.

{% highlight python linenos %}
def aesEncrypt(self, message):
    try:
        cipher = self.__aesGetCipher(self.ENCRYPT)
        encMessage = cipher.update(message)
        return encMessage + cipher.final()
    except M2Crypto.EVP.EVPError as evpe:
        raise CryptoError(str(evpe))

def aesDecrypt(self, message):
    try:
        cipher = self.__aesGetCipher(self.DECRYPT)
        decMessage = cipher.update(message)
        return decMessage + cipher.final()
    except M2Crypto.EVP.EVPError as evpe:
        raise CryptoError(str(evpe))

def __aesGetCipher(self, op):
    return M2Crypto.EVP.Cipher(alg='aes_256_cbc', key=self.aesKey, iv=self.aesIv, salt=self.aesSalt, d='sha256', op=op)

{% endhighlight %}

The structure of these functions is to first create a cipher for encryption or decryption which is handled by the <code>__aesGetCipher()</code> function. This creates a 256 AES CBC cipher with the AES key, IV, salt, and a SHA256 digest we created in the key generation function. After obtaining the cipher, the encrypt/decrypt functions call the <code>update()</code> function of the cipher to update it with the data to be encrypted/decrypted. Lastly, it calls the <code>final()</code> function which finishes the encryption/decryption.

For convenience, I wrote a wrapper class around Python's socket class called encrypted socket that encrypts/decrypts data in its <code>send()</code> and <code>recv()</code> functions. The type of encryption can be changed from no encryption to RSA to AES at will with a <code>setEncryptionType()</code> function.

The handshake between the client and server involves exchanging public keys and then the server encrypting the AES key, IV, and salt with the server's public key and then sending them to the client. After the handshake, all communication is done over AES.

{% highlight python linenos %}
def doServerHandshake(sock):
    # Send the server's public key
    localPubKey = sock.crypto.getLocalPubKeyAsString()
    sock.send(localPubKey)

    # Receive the client's public key
    remotePubKey = sock.recv()
    sock.crypto.setRemotePubKey(remotePubKey)

    # Switch to RSA encryption to exchange the AES key, IV, and salt
    sock.setEncryptionType(EncSocket.RSA)

    # Send the AES key, IV, and salt
    sock.send(sock.crypto.aesKey)
    sock.send(sock.crypto.aesIv)
    sock.send(sock.crypto.aesSalt)

    # Switch to AES encryption for the remainder of the connection
    sock.setEncryptionType(EncSocket.AES)

def doClientHandshake(sock):
    # Receive the server's public key
    remotePubKey = sock.recv()
    sock.crypto.setRemotePubKey(remotePubKey)

    # Send the client's public key
    localPubKey = sock.crypto.getLocalPubKeyAsString()
    sock.send(localPubKey)

    # Switch to RSA encryption to receive the AES key, IV, and salt
    sock.setEncryptionType(EncSocket.RSA)

    # Receive the AES key, IV, and salt
    sock.crypto.aesKey  = sock.recv()
    sock.crypto.aesIv   = sock.recv()
    sock.crypto.aesSalt = sock.recv()

    # Switch to AES encryption for the remainder of the connection
    sock.setEncryptionType(EncSocket.AES)

{% endhighlight %}


<hr />

Of course, any chat program should be asynchronous when sending and receiving messages. This means that I needed a send thread and a receive thread. This is simple enough with Python, but the problem is that once the send and receive threads are started, the main thread has nothing left to do. By default, a thread in Python will continue running after the main thread has exited. This was a problem for me because it meant that stopping the program was problematic since I couldn't just kill the threads when the main thread caught a <code>SIGINT</code>. The solution to this is to make the threads into daemon threads. In Python, a daemon thread is one that will stop when the main thread has exited. However, this brings up another problem that once the send and receive threads are started, the main thread would exit and thus, kill the daemon threads. The solution is to put the main thread into an infinite sleep loop that will keep it alive so it can terminate on signals and when it dies, it takes the send and receive threads along with it. All said and done, it looks like this:

{% highlight python linenos %}
# Start the sending and receiving threads
threads.CursesSendThread(sock, screen, chatWindow, textboxWindow, textbox).start()
threads.CursesRecvThread(sock, screen, chatWindow, textboxWindow).start()

# Keep the main thread alive so the daemon threads don't die
while True:
    time.sleep(10)

{% endhighlight %}

<code>CursesSendThread</code> and <code>CursesRecvThread</code> are subclasses of Python's <code>threading.Thread</code> class. In their <code>__init__</code> functions, they make themselves daemon threads with:

{% highlight python linenos %}
Thread.__init__(self)
self.daemon = True

{% endhighlight %}

The threads also caused some concurrency issues with the Curses UI. However, this was easily solved by making all the Curses calls in the threads into a critical section and wrapping them inside a shared mutex. The blocking calls (waiting for the user to enter input into the textbox in the send thread and waiting for data from the client in the receive thread) are the only calls outside of the critical section. The <code>run()</code> function of the threads looks a little something like this:

{% highlight python linenos %}
def run(self):
    while True:
        chatInput = self.textbox.edit(self.inputValidator)

        mutex.acquire()

        # Do Curses stuff...

        # Add the new input to the chat window
        self.chatWindow.scroll(1)
        self.chatWindow.addstr(height-1, 0, chatInput[:-1], curses.color_pair(2))

        # Send the input to the client
        try:
            self.sock.send(chatInput[:-1])
        except _exceptions.NetworkError as ne:
            self.sock.disconnect()
            utils.showDialog(self.chatWindow, "Network Error", str(ne), True)

        # Refresh the Curses windows
        self.chatWindow.refresh()
        self.textboxWindow.refresh()

        mutex.release()

{% endhighlight %}

&nbsp;

<hr />

Lastly, let's look at the current Curses UI. Upon starting the program, an option to run it as a server or a client is given.

![]({{ site.baseurl }}/assets/images/2013/05/c1.png)


In this case, I select server and it then waits for connections.

![]({{ site.baseurl }}/assets/images/2013/05/c2.png)


I then start another instance of the program and select client this time. After this, I'm prompted for the host to connect to. In this case, I'm just doing everything on my localhost.

![]({{ site.baseurl }}/assets/images/2013/05/c3.png)


The client tries to connect to the server and displays a connecting message.

![]({{ site.baseurl }}/assets/images/2013/05/c4.png)


Upon receiving a connection, the server displays a message to the user with the client connecting and the option to accept or reject the connection.

![]({{ site.baseurl }}/assets/images/2013/05/c5.png)


After accepting the connection, the server and client will exchange keys and the two users can chat!

![]({{ site.baseurl }}/assets/images/2013/05/c7.png)


<hr />

What's next? There's a few items on my TODO list including:

* Give it a pretty QT interface
* Get it running on Windows (sans the Curses UI; that will remain a Linux only feature)
* Add the ability to add your own RSA keypair or save a generated keypair
* A way to display the server's public key fingerprint so the client can verify the public key actually belongs to the server over a trusted medium (person to person or a phone connection) to avoid MITM cks
* Streamline the process of running the application as much as possible (preferably to the point that one only needs to run a single binary with no dependencies on external libraries)
* Possibly allow the server to handle simultaneous connections.
* Write more extensive tests

The full code is <a href="https://github.com/shanet/Cryptully">available on GitHub</a>.
