---
layout: post
title: Working with binary data in C and OpenSSL
date: 2013-08-29 02:53:25 -0700
---

<strong>Crypto disclaimer! I am NOT a crypto expert. Don't take the information here as 100% correct; you should verify it yourself. </strong><a href="http://happybearsoftware.com/you-are-dangerously-bad-at-cryptography.html">You are dangerously bad at crypto.</a>

<hr />

<a title="OpenSSL, RSA, AES and C++" href="http://shanetully.com/2012/06/openssl-rsa-aes-and-c/">My post on how to do basic AES and RSA encryption</a> has, for a while now, been one of the most popular posts on my blog, but I continually get questions about why people can't print out the encrypted messages like a normal string or write them to a file using <code>fprintf()</code>. The short answer is that encrypted messages are binary data, not ASCII strings with a NUL terminator and thus, they can't be treated as if they're ASCII data with a NUL terminator. You might be saying, "but I want to send an encrypted message to my friend as ASCII!".

<strong>Well, time for base64.</strong>

<strong></strong>We can use base64 to encode our encrypted messages into ASCII strings and then back again to binary data for decryption. OpenSSL has a way of doing this for us:

{% highlight c linenos=table %}
char* base64Encode(const unsigned char *message, const size_t length) {
    BIO *bio;
    BIO *b64;
    FILE* stream;

    int encodedSize = 4*ceil((double)length/3);
    char *buffer = (char*)malloc(encodedSize+1);
    if(buffer == NULL) {
        fprintf(stderr, "Failed to allocate memory\n");
        exit(1);
    }

    stream = fmemopen(buffer, encodedSize+1, "w");
    b64 = BIO_new(BIO_f_base64());
    bio = BIO_new_fp(stream, BIO_NOCLOSE);
    bio = BIO_push(b64, bio);
    BIO_set_flags(bio, BIO_FLAGS_BASE64_NO_NL);
    BIO_write(bio, message, length);
    (void)BIO_flush(bio);
    BIO_free_all(bio);
    fclose(stream);

    return buffer;
}

{% endhighlight %}


<!--more-->

{% highlight c linenos=table %}
int base64Decode(const char *b64message, const size_t length, unsigned char **buffer) {
    BIO *bio;
    BIO *b64;
    int decodedLength = calcDecodeLength(b64message, length);

    *buffer = (unsigned char*)malloc(decodedLength+1);
    if(*buffer == NULL) {
        fprintf(stderr, "Failed to allocate memory\n");
        exit(1);
    }
    FILE* stream = fmemopen((char*)b64message, length, "r");

    b64 = BIO_new(BIO_f_base64());
    bio = BIO_new_fp(stream, BIO_NOCLOSE);
    bio = BIO_push(b64, bio);
    BIO_set_flags(bio, BIO_FLAGS_BASE64_NO_NL);
    decodedLength = BIO_read(bio, *buffer, length);
    (*buffer)[decodedLength] = '\0';

    BIO_free_all(bio);
    fclose(stream);

    return decodedLength;
}

int calcDecodeLength(const char *b64input, const size_t length) {
    int padding = 0;

    // Check for trailing '=''s as padding
    if(b64input[length-1] == '=' && b64input[length-2] == '=')
        padding = 2;
    else if (b64input[length-1] == '=')
        padding = 1;

    return (int)length*0.75 - padding;
}

{% endhighlight %}

Let's say we have some encrypted data in a buffer called "encryptedFile". We can encode it with base64 as such:

{% highlight c linenos=table %}
char *base64Buffer;
base64Buffer = base64Encode(encryptedFile, encryptedFileLength);

{% endhighlight %}

And now we can use base64Buffer as a normal C-string with <code>printf()</code>, <code>strlen()</code>, etc.

<strong>What about writing binary data to a file?</strong>

This basically comes down to using <code>fwrite()</code> instead of the <code>fprintf()</code> you might use to write ASCII strings to a file.

{% highlight c linenos=table %}
void writeFile(char *filename, unsigned char *file, size_t fileLength) {
    FILE *fd = fopen(filename, "wb");
    if(fd == NULL) {
        fprintf(stderr, "Failed to open file: %s\n", strerror(errno));
        exit(1);
    }

    size_t bytesWritten = fwrite(file, 1, fileLength, fd);

    if(bytesWritten != fileLength) {
        fprintf(stderr, "Failed to write file\n");
        exit(1);
    }

    fclose(fd);
}

{% endhighlight %}

Reading back the file with <code>fread()</code> involves knowing the size of the file first so we know how many bytes to read. That's simple enough to do with the <code>fseek()</code> function once the file is opened, however.

{% highlight c linenos=table %}
int readFile(char *filename, unsigned char **file) {
    FILE *fd = fopen(filename, "rb");
    if(fd == NULL) {
        fprintf(stderr, "Failed to open file: %s\n", strerror(errno));
        exit(1);
    }

    // Determine size of the file
    fseek(fd, 0, SEEK_END);
    size_t fileLength = ftell(fd);
    fseek(fd, 0, SEEK_SET);

    // Allocate space for the file
    *file = (unsigned char*)malloc(fileLength);
    if(*file == NULL) {
        fprintf(stderr, "Failed to allocate memory\n");
        exit(1);
    }

    // Read the file into the buffer
    size_t bytesRead = fread(*file, 1, fileLength, fd);

    if(bytesRead != fileLength) {
        fprintf(stderr, "Error reading file\n");
        exit(1);
    }

    fclose(fd);

    return fileLength;
}

{% endhighlight %}

Knowing all this, we can now read/write encrypted data to files and encode/decode encrypted data to base64 to use it as C-strings. With this knowledge we can do something fun, like, read in an arbitrary file, encrypt it, save it to a file, and then read it back and decrypt and save it to another file.

<strong><a href="https://github.com/shanet/Crypto-Example/blob/master/crypto-file-example.cpp">See the full example on GitHub</a></strong>.

The only problem with this is that it will not scale to very large files since it reads the entire file into memory before encrypting it. A better to do this would be to read a chunk, encrypt it, write the encrypted chunk to a file and so on until the entire has been encrypted.
