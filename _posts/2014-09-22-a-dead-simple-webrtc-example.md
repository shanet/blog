---
layout: post
title: A Dead Simple WebRTC Example
date: 2014-09-22
---

As of August 2014, WebRTC is still a new and untamed beast. As such, I found that there is a lack of simple and easy to understand examples for someone getting started with WebRTC. My goal was to create my own, as simple as possible, proof of concept WebRTC video conference page that achieved the following goals:

* 1-to-1 video chat
* Pure WebRTC; no external libraries
* Works in current versions of Firefox and Chrome

Before getting into the actual WebRTC APIs, it's best to understand a simple signaling server. For those unaware, WebRTC requires that peers exchange information on how to connect to one another before the actual connection can be begin. However, this exact method is left up to the developer. It could be anything from a very complicated server to peers emailing one another. For my purpose, I chose to write a short and sweet Node.js server that communicates with clients via websockets.

<!--more-->
<hr />

Let's take a look at the server. It uses the `ws` module which can installed with: `npm install ws`.

{% highlight javascript linenos=table %}
var WebSocketServer = require('ws').Server;

var wss = new WebSocketServer({port: 3434});

wss.broadcast = function(data) {
    for(var i in this.clients) {
        this.clients[i].send(data);
    }
};

wss.on('connection', function(ws) {
    ws.on('message', function(message) {
        console.log('received: %s', message);
        wss.broadcast(message);
    });
});

{% endhighlight %}

And that's the whole server. For the finer details of the syntax it's best to refer to the [`ws` documentation](https://github.com/einaros/ws/blob/master/doc/ws.md), but let's go over what's going on here at a high level.

First we create a `WebSocketServer` on port 3434 (chosen completely arbitrarily) and then create a function that given a message will broadcast said message to all connected clients as such:

{% highlight javascript linenos=table %}
wss.broadcast = function(data) {
    for(var i in this.clients) {
        this.clients[i].send(data);
    }
};
{% endhighlight %}

Lastly, whenever we recieve a message from a client, we simply broadcast the message to all other clients (including itself. And that's all there is to it. Like I said, keeping it super simple.

<hr />

Now for the client side (where things get more complicated unforunately). That said, rather than dumping a whole mess of code, let's go through it piece by piece. It's a good idea to reference the WebRTC documentation while reading. I've found that the [MDN documentation](https://developer.mozilla.org/en-US/docs/Web/Guide/API/WebRTC) is the most complete.

The HTML is short and sweet. Take note of the two video element's IDs.

{% highlight html linenos=table %}
<html>
    <head>
        <script src="webrtc.js"></script>
    </head>

    <body>
        <video id="localVideo" autoplay muted style="width:40%;"></video>
        <video id="remoteVideo" autoplay style="width:40%;"></video>

        <br />

        <input type="button" id="start" onclick="start(true)" value="Start Video"></input>

        <script type="text/javascript">
            pageReady();
        </script>
    </body>
</html>
{% endhighlight %}

Now for the Javascript. First up, we create a few globals.

{% highlight javascript linenos=table %}
var localVideo;
var remoteVideo;
var peerConnection;
var peerConnectionConfig = {'iceServers': [{'url': 'stun:stun.services.mozilla.com'}, {'url': 'stun:stun.l.google.com:19302'}]};
{% endhighlight %}

* `localVideo` will refer to the video and audio stream from the local computer.
* `remoteVideo` will refer to the video and audio stream from the remote computer.
* `peerConnection` will be the WebRTC connection between the local and remote computers.
* `peerConnectionConfig` is a dictionary of configuration options for the `peerConnection` object. In this case, we only specify the public STUN servers operated by Mozilla and Google. More on this later.

Because WebRTC is still new, many of the class names are prefixed. Many examples will use `adapter.js` which accounts for these prefixes. Given that there's only one function and three classes we need for this example, I opted to not use `adapter.js` as it eliminates a dependency. That said:

{% highlight javascript linenos=table %}
navigator.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia;
window.RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
window.RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate || window.webkitRTCIceCandidate;
window.RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;
{% endhighlight %}

With those at the top of the file, we don't have to worry about those prefixes anymore.

Finally time for something fun! Next, we need to get our local video and audio stream. This is accomplished with the `getUserMedia` function. When the page is ready, we'll call a function aptly named `pageReady` which will connect to our signaling server and request a stream from the user's webcam and microphone.

**Note:** If you plan to open a local file in Chrome you'll need to start Chrome with the `--allow-file-access-from-files` flag in order to use the `getUserMedia()` call.

{% highlight javascript linenos=table %}
function pageReady() {
    localVideo = document.getElementById('localVideo');
    remoteVideo = document.getElementById('remoteVideo');

    serverConnection = new WebSocket('ws://127.0.0.1:3434');
    serverConnection.onmessage = gotMessageFromServer;

    var constraints = {
        video: true,
        audio: true,
    };

    if(navigator.getUserMedia) {
        navigator.getUserMedia(constraints, getUserMediaSuccess, getUserMediaError);
    } else {
        alert('Your browser does not support getUserMedia API');
    }
}
{% endhighlight %}

Let's talk about the `getUserMedia` callbacks first. On success, we assign the given video stream to the global `localStream` variable we created. Then we attach that stream to the `localVideo` video element. This will display the video stream from the webcam in the video element. Note that the local video element has the muted attribute set in the HTML. For local video we don't want to output our local audio stream, otherwise this will cause echos and feedback. On error just log it to the console.

{% highlight javascript linenos=table %}
function getUserMediaSuccess(stream) {
    localStream = stream;
    localVideo.src = window.URL.createObjectURL(stream);
}

function getUserMediaError(error) {
    console.log(error);
}
{% endhighlight %}

<hr />

Now for the really *fun* part: WebRTC.

The way this demo is structured is that both participants load the page and then one clicks the Start button. The reason for this is that after clicking the button, we're going to start firing off messages to the signaling server in order to connect to the other client. If the other client isn't already connected to the server, these messages will never reach their destination. Of course, there are methods that allow for participants to "drop-in" to a WebRTC connection, but that's more complicated so we'll skip it here.

The first action we need to perform is to create an `RTCPeerConnection` object. `RTCPeerConnection` is the primary class used in WebRTC connections. For our purposes, we only have a single `RTCPeerConnection` since we're only connecting to one other client.

Next, we're going to assign some callback functions. So what's an ICE candidate? An ICE candidate is essentially a description of how to connect to a client. In order for anyone to connect to us, we need to share our ICE candidates with the other client. Once an `RTCPeerConnection` object is created, it will start gathering ICE candidates. As you can imagine, it doesn't take much time for the browser to determine how another client on the same LAN can connect to it, but determining how to traverse a NAT can take a little bit longer. Thus, we have an `onicecandidate` callback that will be called whenever the browser finds a new ICE candidate. At this point, we send the candidate to our signaling server so it can sent to the other client. A `NULL` candidate denotes that the browser is finished gathering candidates.

`onaddstream` is relatively straightforward. It will be called whenever we get a stream from the other client. This is excellent because it means that our connection succeeded! Upon getting a remote stream, we attach it to the remote video element.

Lastly, if we're the caller (we clicked the start button), we create an offer which tells the other client how to interact with us once the network connection is established. This includes info about ourselves such as video and audio formats. The formal name for this called Session Description Protocol or SDP; hence the callback `gotDescription`. Once we have an offer (`gotDescription` was called), we set the local description to it and then send it to the signaling server to be sent to the other client.

{% highlight javascript linenos=table %}
function start(isCaller) {
    peerConnection = new RTCPeerConnection(peerConnectionConfig);
    peerConnection.onicecandidate = gotIceCandidate;
    peerConnection.onaddstream = gotRemoteStream;
    peerConnection.addStream(localStream);

    if(isCaller) {
        peerConnection.createOffer(gotDescription, createOfferError);
    }
}

function gotDescription(description) {
    console.log('got description');
    peerConnection.setLocalDescription(description, function () {
        serverConnection.send(JSON.stringify({'sdp': description}));
    }, function() {console.log('set description error')});
}

function gotIceCandidate(event) {
    if(event.candidate != null) {
        serverConnection.send(JSON.stringify({'ice': event.candidate}));
    }
}

function gotRemoteStream(event) {
    console.log("got remote stream");
    remoteVideo.src = window.URL.createObjectURL(event.stream);
}

function createOfferError(error) {
    console.log(error);
}
{% endhighlight %}

<hr />

We handled the client doing the calling, but what about the answering client?

Whenever we get a message from the server, we first check if the `RTCPeerConnection` object has been created yet. If not, call the start function, but not as the caller since we need to answer the incoming offer, not create a new offer.

Next we determine if the message is a description or an ICE candidate. If a description, we set it as the remote description on our `RTCPeerConnection` object and then create an answer. Note that we are not sending the answer back through the signaling server. After all this work, we're ready to let the browser directly connect to the other client.

If the message is an ICE candidate, all we need to do is add the candidate to the `RTCPeerConnection` object. If we have created an answer already, but haven't successfully connected to the caller, the browser will continue trying candidates until a connection is made or it runs out of candidates.

{% highlight javascript linenos=table %}
function gotMessageFromServer(message) {
    if(!peerConnection) start(false);

    var signal = JSON.parse(message.data);
    if(signal.sdp) {
        peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp), function() {
            peerConnection.createAnswer(gotDescription, createAnswerError);
        });
    } else if(signal.ice) {
        peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice));
    }
}
{% endhighlight %}

At this point, we've set everything up so we let the WebRTC internals take over and if everything went well, the `onaddstream` callback will be called and we'll get our remote stream. If you've been putting this together piece by piece, go ahead and fire it up. If you want a full example already ready to go, see below.

<hr />

That's the essentials of WebRTC. Of course, this was a very basic example, but it can be extended to allow for "drop-in" calls, a more sophisticated signaling server, handling multiple clients, and whatever other use you find for it.

[Full code listing is available on GitHub](https://github.com/shanet/WebRTC-Example).
