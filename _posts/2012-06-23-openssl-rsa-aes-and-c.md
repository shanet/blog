---
layout: post
title: OpenSSL, RSA, AES and C++
date: 2012-06-23 15:00:40
---

<strong>Disclaimer: I am NOT a crypto expert. Don't take the information here as 100% correct; you should verify it yourself. </strong><a href="http://happybearsoftware.com/you-are-dangerously-bad-at-cryptography.html">You are dangerously bad at crypto.</a>

This post details the EVP functions for RSA. If you're looking for a pure RSA implementation or want something in C rather than C++, <a href="{% post_url 2012-04-28-simple-public-key-encryption-with-rsa-and-openssl %}">see my other post on this</a>.

<hr />

In my seemingly endless side project to implement RSA and AES encryption to my <a href="https://github.com/shanet/Alsa-Channel-Control">Alsa Server project</a>, I wrote a while ago about doing <a href="{% post_url 2012-04-28-simple-public-key-encryption-with-rsa-and-openssl %}">simple RSA encryption with OpenSSL.</a> Now, I'm here to say that I was doing it all wrong. In my first post about RSA encryption and OpenSSL my code was using the low level RSA functions when I should have been using the high level EVP (envelope) functions, which are much nicer to work with once you get the hang of them.

Being that this code is eventually going to be merged in my Alsa server project, I went ahead and also implemented AES encryption/decryption and put everything in an easy to use C++ class.

I assume that readers are familiar with encryption and OpenSSL terminology (things like IV, key lengths, public vs private keys, etc.). If not, look it up since there are much better explanations out there than I could write.

Why use the EVP (envelope) functions for RSA encryption rather than the actual RSA functions? Becasue the EVP functions don't actually encrypt your data with RSA. Rather, they encrypted a symmetric key with RSA and then encrypt your data with the symmetric key. There's a few reasons for this. The main one being that RSA has a max length limit to how much data can be encrypted at once. Symmetric ciphers do not have this limit. If you want pure RSA, <a href="{% post_url 2012-04-28-simple-public-key-encryption-with-rsa-and-openssl %}">see my post about that</a>, otherwise, you probably want to be using the EVP functions.

<!--more-->

Moving on. First up, since all the code presented is in various functions from a class (full listing is at the end), let's look at the class members, and constructors first to understand where some of these variables are coming from. Below are all the class members. I know, not exactly intuitive, but bear with me.

{% highlight c++ linenos=table %}
static EVP_PKEY *localKeypair;
EVP_PKEY *remotePubKey;

EVP_CIPHER_CTX *rsaEncryptCtx;
EVP_CIPHER_CTX *aesEncryptCtx;

EVP_CIPHER_CTX *rsaDecryptCtx;
EVP_CIPHER_CTX *aesDecryptCtx;

unsigned char *aesKey;
unsigned char *aesIV;

{% endhighlight %}

* The <code>EVP_PKEY</code> variables store the public and private keys for the server, or just the public key for the client.
* The <code>EVP_CIPHER_CTX</code> variables keep track of the RSA and AES encryption/decryption processes and do all the hard, behind the scenes work.
* <code>aesKey</code> and <code>aesIV</code> are the symmetric key and IV used for the AES functions.

So now we need to initialize all these guys. In the class there are two constructors, each with different arguments so let's look at the default constructor for simplicity's sake.

{% highlight c++ linenos=table %}
Crypto::Crypto() {
    serverKeypair = NULL;
    clientPubKey  = NULL;

    #ifdef PSUEDO_CLIENT
        genTestClientKey();
    #endif

    init();
}

{% endhighlight %}

The RSA keys are just set to NULL because their values will be initialized later when the RSA/AES functions are called. The <code>#ifdef</code> line certainly peaks some interest. Since this class is eventually going to be dropped in a server, it will be using the client's public key to encrypt data, but we don't have a client yet, so we define a fake client and generate another RSA key pair to simulate a client. The process of generating this key pair is identical to how we're about to generate the key pair for the server so let's look at this. This is all contained in the <code>init()</code> function.


{% highlight c++ linenos=table %}
int Crypto::init() {
    // Initalize contexts
    rsaEncryptCtx = (EVP_CIPHER_CTX*)malloc(sizeof(EVP_CIPHER_CTX));
    aesEncryptCtx = (EVP_CIPHER_CTX*)malloc(sizeof(EVP_CIPHER_CTX));

    rsaDecryptCtx = (EVP_CIPHER_CTX*)malloc(sizeof(EVP_CIPHER_CTX));
    aesDecryptCtx = (EVP_CIPHER_CTX*)malloc(sizeof(EVP_CIPHER_CTX));

    // Always a good idea to check if malloc failed
    if(rsaEncryptCtx == NULL || aesEncryptCtx == NULL || rsaDecryptCtx == NULL || aesDecryptCtx == NULL) {
        return FAILURE;
    }

    // Init these here to make valgrind happy
    EVP_CIPHER_CTX_init(rsaEncryptCtx);
    EVP_CIPHER_CTX_init(aesEncryptCtx);

    EVP_CIPHER_CTX_init(rsaDecryptCtx);
    EVP_CIPHER_CTX_init(aesDecryptCtx);

    // Init RSA
    EVP_PKEY_CTX *ctx = EVP_PKEY_CTX_new_id(EVP_PKEY_RSA, NULL);

    if(EVP_PKEY_keygen_init(ctx) <= 0) {
        return FAILURE;
    }

    if(EVP_PKEY_CTX_set_rsa_keygen_bits(ctx, RSA_KEYLEN) <= 0) {
        return FAILURE;
    }

    if(EVP_PKEY_keygen(ctx, &amp;localKeypair) <= 0) {
        return FAILURE;
    }

    EVP_PKEY_CTX_free(ctx);

    // Init AES
    aesKey = (unsigned char*)malloc(AES_KEYLEN/8);
    aesIV = (unsigned char*)malloc(AES_KEYLEN/8);

    unsigned char *aesPass = (unsigned char*)malloc(AES_KEYLEN/8);
    unsigned char *aesSalt = (unsigned char*)malloc(8);

    if(aesKey == NULL || aesIV == NULL || aesPass == NULL || aesSalt == NULL) {
        return FAILURE;
    }

    // For the AES key we have the option of using a PBKDF (password-baswed key derivation formula)
    // or just using straight random data for the key and IV. Depending on your use case, you will
    // want to pick one or another.
    #ifdef USE_PBKDF
        // Get some random data to use as the AES pass and salt
        if(RAND_bytes(aesPass, AES_KEYLEN/8) == 0) {
            return FAILURE;
        }

        if(RAND_bytes(aesSalt, 8) == 0) {
            return FAILURE;
        }

        if(EVP_BytesToKey(EVP_aes_256_cbc(), EVP_sha256(), aesSalt, aesPass, AES_KEYLEN/8, AES_ROUNDS, aesKey, aesIV) == 0) {
            return FAILURE;
        }
    #else
        if(RAND_bytes(aesKey, AES_KEYLEN/8) == 0) {
            return FAILURE;
        }

        if(RAND_bytes(aesIV, AES_KEYLEN/8) == 0) {
            return FAILURE;
        }
    #endif

    free(aesPass);
    free(aesSalt);

    return SUCCESS;
}

{% endhighlight %}

There's a lot of strange function calls in here. Most of this function deals with the OpenSSL API and how to generate keys and initialize EVP contexts. I'll give a high level overview here, but the best way to understand this process is to read up <a href="http://linux.die.net/man/3/evp_cipher_ctx_init">on documentation</a>. The first thing we do is allocate the proper amount of memory for the EVP contexts and then called the <code>EVP_CIPHER_CTX_init()</code> function which does some magic to initialize them. Then we use a few RSA functions to generate the RSA keys for the server. Again, the documentation for these functions will help you understand better than my explanation can, but you'll see a pattern emerge, initialize the context, pass it along with some options and an output argument to a function and you'll get what you want. It's the same way for RSA. We initialize the key context with <code>EVP_PKEY_CTX_new_id()</code> and <code>EVP_PKEY_keygen_init()</code>, set the key length to use with <code>EVP_PKEY_CTX_set_rsa_keygen_bits()</code> (see the full listing for the actual length if you really need to--2056 bits is sufficient for most cases; use 4096 if you're paranoid) and then actually generate the keys with <code>EVP_PKEY_keygen()</code>.

The AES key is much simpler; it's just random data so we call <code>RAND_bytes()</code> to get the number of random bytes needed for the AES encrypted key and IV. There is also the option to use the <code>EVP_BytesToKey()</code> function which is a PBKDF. This function, as I called it, will generate a 256 bit key in CBC mode, with a salt and passphrase that are random data (the password being random data is just for demonstration purposes). The number of rounds (or count as the documentation calls it) is the strength of randomness to use. Higher numbers are better, but slower.

I mentioned above that we generate a separate client key pair for testing. I won't do a write-up on it since it's the same process as generating the server key pair, only we store the keys in their own variables of course, but you can see the <code>genTestClientKey()</code> function in the full code listing below for how this is done.

On to the fun part, the actual encryption. Let's start with AES since it's a little easier to understand. The AES encryption function:


{% highlight c++ linenos=table %}
int Crypto::aesEncrypt(const unsigned char *msg, size_t msgLen, unsigned char **encMsg) {
    size_t blockLen  = 0;
    size_t encMsgLen = 0;

    *encMsg = (unsigned char*)malloc(msgLen + AES_BLOCK_SIZE);
    if(encMsg == NULL) return FAILURE;

    if(!EVP_EncryptInit_ex(aesEncryptCtx, EVP_aes_256_cbc(), NULL, aesKey, aesIV)) {
        return FAILURE;
    }

    if(!EVP_EncryptUpdate(aesEncryptCtx, *encMsg, (int*)&amp;blockLen, (unsigned char*)msg, msgLen)) {
        return FAILURE;
    }
    encMsgLen += blockLen;

    if(!EVP_EncryptFinal_ex(aesEncryptCtx, *encMsg + encMsgLen, (int*)&blockLen)) {
        return FAILURE;
    }

    EVP_CIPHER_CTX_cleanup(aesEncryptCtx);

    return encMsgLen + blockLen;
}

{% endhighlight %}

The arguments are probably as you would expect, the message to be encrypted, the length of that message, and an output string for the encrypted message (which should just be a NULL pointer unless you like memory leaks).

The first step is allocate memory for the encrypted message. Because the message will be padded for extra space left over in the last block, we need to allocate the length of the unencrypted message plus the max size of an AES block to make sure there's enough room in the buffer.

A pattern quickly emerges when doing encryption/decryption with both AES and RSA. First there's a call to an init function, <code>EVP_EncryptInit_ex()</code> in this case, then a call to an update function, <code>EVP_EncryptUpdate()</code> here and finally a call to a finalize function, or <code>EVP_EncryptFinal_ex()</code>. Each of these functions has two versions, a "regular" one and one suffixed with <code>_ex</code>. The <code>_ex</code> versions just provide a few extra parameters. See the documentation for the exact differences; I only used the <code>_ex</code> functions where necessary.

So, a little more info on the encryption process. First, we call the init function to initialize the context for encryption. Then the update function actually starts encrypting the message. This may involve multiple calls to the update function so if you were say, encrypting an entire file, you could read the file line by line, calling the update function as you read each line to encrypt it in a loop. In this case, we're only encrypting a single message so we only need to call it once.<strong> The update function will return the number of bytes that were encrypted. It is our responsibility to keep track of the total number of bytes encrypted and to advance the encrypted message pointer for each subsequent call to the update and finalize function, otherwise you will be overwriting previously encrypted data.</strong> I bold this because the documentation does not make reference to this and was the source of much confusion when I was originally writing these functions. Thankfully, one of the smart people over at <a href="http://stackoverflow.com/questions/10727133/openssl-rsa-unable-to-encrypt-decrypt-messages-longer-than-16-bytes">Stack Overflow helped me out</a>. Now, the last step is to finalize the encryption. This is will pad extra space in the buffer to fill up the last block and then that completes the encryption! In my function I update the number of bytes encrypted and return that to the caller. It is important to return the number of bytes encrypted so the caller can keep track of the encrypted message length <strong>because it is now a binary string and calling <code>strlen()</code> on it won't give the correct length</strong>. Though it's possible to convert it to base64.

Lastly, clean up the context to avoid memory leaks.

<hr />

On to decryption!


{% highlight c++ linenos=table %}
int Crypto::aesDecrypt(unsigned char *encMsg, size_t encMsgLen, unsigned char **decMsg) {
    size_t decLen   = 0;
    size_t blockLen = 0;

    *decMsg = (unsigned char*)malloc(encMsgLen);
    if(*decMsg == NULL) return FAILURE;

    if(!EVP_DecryptInit_ex(aesDecryptCtx, EVP_aes_256_cbc(), NULL, aesKey, aesIV)) {
        return FAILURE;
    }

    if(!EVP_DecryptUpdate(aesDecryptCtx, (unsigned char*)*decMsg, (int*)&amp;blockLen, encMsg, (int)encMsgLen)) {
        return FAILURE;
    }
    decLen += blockLen;

    if(!EVP_DecryptFinal_ex(aesDecryptCtx, (unsigned char*)*decMsg + decLen, (int*)&blockLen)) {
        return FAILURE;
    }
    decLen += blockLen;

    EVP_CIPHER_CTX_cleanup(aesDecryptCtx);

    return (int)decLen;
}

{% endhighlight %}


The AES decryption function looks very similar to the encryption function. The arguments are the encrypted message, its length, and a double pointer to an output buffer for the decrypted string (should be NULL as well else memory leaks). The decryption process is very similar to encryption so I won't go into as much detail as I did with encryption here. First we allocate memory for the decrypted string, init our decryption context, call the update function on the encrypted message (note we have to keep track of the number of decrypted bytes here too), and then finalize the decryption. That's all there is to it.

<hr />

Next up, RSA.


{% highlight c++ linenos=table %}
int Crypto::rsaEncrypt(const unsigned char *msg, size_t msgLen, unsigned char **encMsg, unsigned char **ek,
                       size_t *ekl, unsigned char **iv, size_t *ivl) {
    size_t encMsgLen = 0;
    size_t blockLen  = 0;

    *ek = (unsigned char*)malloc(EVP_PKEY_size(remotePubKey));
    *iv = (unsigned char*)malloc(EVP_MAX_IV_LENGTH);
    if(*ek == NULL || *iv == NULL) return FAILURE;
    *ivl = EVP_MAX_IV_LENGTH;

    *encMsg = (unsigned char*)malloc(msgLen + EVP_MAX_IV_LENGTH);
    if(encMsg == NULL) return FAILURE;

    if(!EVP_SealInit(rsaEncryptCtx, EVP_aes_256_cbc(), ek, (int*)ekl, *iv, &remotePubKey, 1)) {
        return FAILURE;
    }

    if(!EVP_SealUpdate(rsaEncryptCtx, *encMsg + encMsgLen, (int*)&blockLen, (const unsigned char*)msg, (int)msgLen)) {
        return FAILURE;
    }
    encMsgLen += blockLen;

    if(!EVP_SealFinal(rsaEncryptCtx, *encMsg + encMsgLen, (int*)&blockLen)) {
        return FAILURE;
    }
    encMsgLen += blockLen;

    EVP_CIPHER_CTX_cleanup(rsaEncryptCtx);

    return (int)encMsgLen;
}

{% endhighlight %}


Again, RSA is very similar to AES. The major difference being that we're now using the "Seal" functions. The OpenSSL API differentiates between Seal &amp; Open for encrypting with public keys and decrypting with private keys and Sign &amp; Verify for encrypting with private keys and decrypting with public keys. Since I will eventually be dropping this in a server, I want to be encrypting with public keys so I'm using the Seal functions here.

As before, we first allocate memory for the encrypted message. A limitation of RSA is that the max length of the encrypted message is roughly equal to the length of the key it's being encrypted with. However, a key point of the EVP functions is that they don't acutally encrypt your data with RSA, but rather encrypt a symmetric key with RSA and then use the symmetric key to encrypt your data since there is no max length on symmetric key encryption. This is also what the <code>ek</code> argument is. It will returned the encrypted symmetric key that the data is actually encrypted with. To decrypt it, we'll need the symmetric key and the IV. This is a lot of data to keep track of, but that's part of the challenge of using encryption.

From here we init the  context again, call the update function (only once since we only have one message) and then finalize it all while keeping track of the number of bytes that were encrypted.

<hr />

Decryption time.


{% highlight c++ linenos=table %}
int Crypto::rsaDecrypt(unsigned char *encMsg, size_t encMsgLen, unsigned char *ek, size_t ekl,
                       unsigned char *iv, size_t ivl, unsigned char **decMsg) {
    size_t decLen   = 0;
    size_t blockLen = 0;
    EVP_PKEY *key;

    *decMsg = (unsigned char*)malloc(encMsgLen + ivl);
    if(decMsg == NULL) return FAILURE;

    #ifdef PSUEDO_CLIENT
        key = remotePubKey;
    #else
        key = localKeypair;
    #endif

    if(!EVP_OpenInit(rsaDecryptCtx, EVP_aes_256_cbc(), ek, ekl, iv, key)) {
        return FAILURE;
    }

    if(!EVP_OpenUpdate(rsaDecryptCtx, (unsigned char*)*decMsg + decLen, (int*)&blockLen, encMsg, (int)encMsgLen)) {
        return FAILURE;
    }
    decLen += blockLen;

    if(!EVP_OpenFinal(rsaDecryptCtx, (unsigned char*)*decMsg + decLen, (int*)&blockLen)) {
        return FAILURE;
    }
    decLen += blockLen;

    EVP_CIPHER_CTX_cleanup(rsaDecryptCtx);

    return (int)decLen;
}

{% endhighlight %}


Once again, the decryption is similar to AES decryption so I won't go into much detail. One interesting note, however, is the <code>#ifdef</code>. This is where the client key pair I made in the init function way above comes into place. Because this is all just a test of the crypto functions, I don't have a client to give me a public key from yet. So we generated an extra key pair at the beginning to simulate the client's keypair key with. In the future, decryption will be done with the server's private key and we will, of course, not have access to the client's private key so that's where the <code>#ifdef</code> comes from.

Other than that, the typical init, update, finalize process is in effect again. After decryption we have a regular char string again so don't forget about the null terminator.

Okay, so we have all these functions now. How about seeing them in action? First, let's look at how to compile this guy.

{% highlight text linenos=table %}
g++ -Wall -Wextra -ggdb -o crypto-example crypto-example.cpp Crypto.cpp -lcrypto

{% endhighlight %}


So here we have debugging and warnings turned on. <code>class_test.cpp</code> is my main file and <code>Crypto.cpp</code> is my class with all the encryption/decryption functions in it. The key part is linking with the OpenSSL library, called the <code>crypto</code> library at the end of the command. Note that like all libraries with g++, it must be after the source files. Also, make sure you have a recent version of OpenSSL. I wrote this with version 1.0.1. YMMV with other versions.

Finally, let's run this guy with a test program (available on GitHub at the link below):


{% highlight text linenos=table %}
$ ./crypto-example
Message to RSA encrypt: there's always money in the banana stand
Encrypted message: SUdnZP7Yy5aOjnfYAgiLob0irTdU0r3stMIDW5KeOH6KWGX8n1dba4WrGMgi4qK1
Decrypted message: there's always money in the banana stand
Message to AES encrypt: I always imagined him in a lighthouse
Encrypted message: b0OHgBFMullKAv+cnthBg7MgUpNkrUGhXsAXdxQFCl/zIebyPClA49D0sNcrK39f
48 bytes decrypted
Decrypted message: I always imagined him in a lighthouse
Message to RSA encrypt: Hermano
Encrypted message: dY3VQOGeMhGYZS/Q3yN4mg==
Decrypted message: Hermano
Message to AES encrypt: Steve Holt!
Encrypted message: Zp+DM/2bbU80T9WhUTmcMg==
16 bytes decrypted
Decrypted message: Steve Holt!

{% endhighlight %}

Arrested Development references aside, you can see that it, at the very least, does encrypt and decrypt our messages. You'll notice that the output has been converted to base64 so it can be printed out as a regular ASCII string.

<h3 class="post-center"><a href="https://github.com/shanet/Crypto-Example">Full code listing (and more!) is available on GitHub</a>.</h3>
