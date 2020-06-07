---
layout: post
title: Writing custom data to NFC tags with Android example
date: 2012-12-31
---

I wanted to add NFC functionality to <a title="Controlling a relay via an Arduino from an Android client with NFC" href="http://shanetully.com/2012/12/controlling-a-relay-via-an-arduino-from-an-android-client-with-nfc/">my RelayRemote project</a> but found the amount of examples about writing custom data to an NFC tag on Android very lacking. The Android docs have a bunch of <a href="http://developer.android.com/guide/topics/connectivity/nfc/nfc.html">info on basic NFC and how it works</a>, but for actually writing the data to the tag, they try to push you to some convenience functions that were added in Jelly Bean (4.1). Unless you're targeting Jelly Bean and up (not likely at the time of this writing), it doesn't help to use these functions.

In my case, I wanted to write the ID of a relay to turn on/off to the tag, which would then be read, have the ID looked up in the database, and let the network thread class send the data to the server. The first step in this process was writing the NFC tag. To do this, we set up a pending intent with an intent that has the data to write to the tag in it. Android will execute this pending intent the next time a tag comes into range. Basically, what we're doing is putting the device into a sort of write mode where when a tag comes into contact, Android will get our app a callback and we'll try to write our data to the tag.

The intent setup looks something like:

{% highlight java linenos %}
// Construct the data to write to the tag
// Should be of the form [relay/group]-[rid/gid]-[cmd]
String nfcMessage = relay_type + "-" + id + "-" + cmd;

// When an NFC tag comes into range, call the main activity which handles writing the data to the tag
NfcAdapter nfcAdapter = NfcAdapter.getDefaultAdapter(context);

Intent nfcIntent = new Intent(context, Main.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
nfcIntent.putExtra("nfcMessage", nfcMessage);
PendingIntent pi = PendingIntent.getActivity(context, 0, nfcIntent, PendingIntent.FLAG_UPDATE_CURRENT);
IntentFilter tagDetected = new IntentFilter(NfcAdapter.ACTION_TAG_DISCOVERED);

nfcAdapter.enableForegroundDispatch((Activity)context, pi, new IntentFilter[] {tagDetected}, null);
{% endhighlight %}

<!--more-->

First I put the data I want written to the tag in <code>nfcMessage</code>, then get a handle to the <code>nfcAdapter</code> (this could fail if the device doesn't support NFC; you should check for this, I did it elsewhere). The rest is pretty much copy and paste code.  Once this executes, Android will execute our intent when the user puts a tag in range of the device.

This callback happens in <code>onNewIntent(Intent intent)</code> which should be overridden in the activity that was used to create the pending intent above.

{% highlight java linenos %}
public void onNewIntent(Intent intent) {
    // When an NFC tag is being written, call the write tag function when an intent is
    // received that says the tag is within range of the device and ready to be written to
    Tag tag = intent.getParcelableExtra(NfcAdapter.EXTRA_TAG);
    String nfcMessage = intent.getStringExtra("nfcMessage");

    if(nfcMessage != null) {
        NFC.writeTag(this, tag, nfcMessage);
    }
}
{% endhighlight %}

Since this function can be called with other intents that just the one we defined, it's a good idea to check if the <code>nfcMessage</code> we made is attached to the intent before moving on. The NFC class and <code>writeTag()</code> functions are functions I wrote to make writing tags easier. Now to actually write the data to the tag:

{% highlight java linenos %}
public static boolean writeTag(Context context, Tag tag, String data) {
    // Record to launch Play Store if app is not installed
    NdefRecord appRecord = NdefRecord.createApplicationRecord(context.getPackageName());

    // Record with actual data we care about
    NdefRecord relayRecord = new NdefRecord(NdefRecord.TNF_MIME_MEDIA,
                                            new String("application/" + context.getPackageName())
                                            .getBytes(Charset.forName("US-ASCII")),
                                            null, data.getBytes());

    // Complete NDEF message with both records
    NdefMessage message = new NdefMessage(new NdefRecord[] {relayRecord, appRecord});

    try {
        // If the tag is already formatted, just write the message to it
        Ndef ndef = Ndef.get(tag);
        if(ndef != null) {
            ndef.connect();

            // Make sure the tag is writable
            if(!ndef.isWritable()) {
                DialogUtils.displayErrorDialog(context, R.string.nfcReadOnlyErrorTitle, R.string.nfcReadOnlyError);
                return false;
            }

            // Check if there's enough space on the tag for the message
            int size = message.toByteArray().length;
            if(ndef.getMaxSize() &lt; size) {
                DialogUtils.displayErrorDialog(context, R.string.nfcBadSpaceErrorTitle, R.string.nfcBadSpaceError);
                return false;
            }

            try {
                // Write the data to the tag
                ndef.writeNdefMessage(message);

                DialogUtils.displayInfoDialog(context, R.string.nfcWrittenTitle, R.string.nfcWritten);
                return true;
            } catch (TagLostException tle) {
                DialogUtils.displayErrorDialog(context, R.string.nfcTagLostErrorTitle, R.string.nfcTagLostError);
                return false;
            } catch (IOException ioe) {
                DialogUtils.displayErrorDialog(context, R.string.nfcFormattingErrorTitle, R.string.nfcFormattingError);
                return false;
            } catch (FormatException fe) {
                DialogUtils.displayErrorDialog(context, R.string.nfcFormattingErrorTitle, R.string.nfcFormattingError);
                return false;
            }
        // If the tag is not formatted, format it with the message
        } else {
            NdefFormatable format = NdefFormatable.get(tag);
            if(format != null) {
                try {
                    format.connect();
                    format.format(message);

                    DialogUtils.displayInfoDialog(context, R.string.nfcWrittenTitle, R.string.nfcWritten);
                    return true;
                } catch (TagLostException tle) {
                    DialogUtils.displayErrorDialog(context, R.string.nfcTagLostErrorTitle, R.string.nfcTagLostError);
                    return false;
                } catch (IOException ioe) {
                    DialogUtils.displayErrorDialog(context, R.string.nfcFormattingErrorTitle, R.string.nfcFormattingError);
                    return false;
                } catch (FormatException fe) {
                    DialogUtils.displayErrorDialog(context, R.string.nfcFormattingErrorTitle, R.string.nfcFormattingError);
                    return false;
                }
            } else {
                DialogUtils.displayErrorDialog(context, R.string.nfcNoNdefErrorTitle, R.string.nfcNoNdefError);
                return false;
            }
        }
    } catch(Exception e) {
        DialogUtils.displayErrorDialog(context, R.string.nfcUnknownErrorTitle, R.string.nfcUnknownError);
    }

    return false;
}
{% endhighlight %}

The first thing we do is create the Ndef records by using the <code>createApplicationRecord()</code> function and creating a new NdefRecord object (if you don't know what an Ndef record is, read the NFC basics article in the Android docs linked above). One record with the application package name. This one will launch the Play Store if our app isn't installed. And another record with the data we care about--our message. To do this we specify that the record is a custom MIME type of the form <code>applcation/[our package name]</code>. This enables Android to direct the data to the proper application with the tag is read. Lastly, our message is put into the Ndef record as the payload.

The final data that will be written to the tag is in an NdefMessage object which is created by passing in an array of the records to write.

Okay, we're finally all set up. The actual writing process is very error prone and most of the code around it is error handling. There's basically two possible cases: the tag is either Ndef formatted already or not. If it is, we first check if it is writable (Ndef tags can be made read only) and if not, check that our message can fit on the tag. If so, write the message with <code>writeNdefMessage()</code>.

If the tag is not Ndef formatted, there's less to check. Just go ahead and format it, which also writes the data to the tag in one go.

<hr />

So we have our data written to the tag. How about reading it back?

When a tag comes into range of the device, Android will read it and determine what app it should go to. This is done, just like everything else of this nature, with intent filters. So in our manifest file, we declare an activity to handle NFC tags. In my case, I created an activity that only handles NFC tags and does nothing else (no UI or anything). In the manifest:

{% highlight xml linenos %}
<activity
    android:name=".NFC"
    android:label="@string/appName">
    <intent-filter>
        <action android:name="android.nfc.action.NDEF_DISCOVERED"/>
        <data android:mimeType="application/[package name]"/>
        <category android:name="android.intent.category.DEFAULT"/>
    </intent-filter>
</activity>

{% endhighlight %}

The MIME type should match the MIME type we wrote to the tag. In this case, <code>application/[our package name]</code>.

Then, my NFC activity looks something like:

{% highlight java linenos %}
@Override
public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    Intent intent = getIntent();
    if(intent.getType() != null && intent.getType().equals("application/" + getPackageName())) {
        // Read the first record which contains the NFC data
        Parcelable[] rawMsgs = intent.getParcelableArrayExtra(NfcAdapter.EXTRA_NDEF_MESSAGES);
        NdefRecord relayRecord = ((NdefMessage)rawMsgs[0]).getRecords()[0];
        String nfcData = new String(relayRecord.getPayload());

        // Display the data on the tag
        Toast.makeText(this, nfcData, Toast.LENGTH_SHORT).show();

        // Do other stuff with the data...

        // Just finish the activity
        finish();
    }
}
{% endhighlight %}

The intent the activity was started with will contain the NFC data. We just need to do a few things to get at it. First, we do another check to make sure the MIME type is correct. Then, pull the Ndef messages from the intent. At this point they are in the form of a parcelable array. We then extract the Ndef records from the Ndef message and get the payload of the record which has our custom data in it. In this short example, we just show it to the user via a toast and exit the activity. This can, of course, be expanded on as you wish.

A full, working example can be seen in <a href="https://github.com/shanet/RelayRemote/blob/master/android/src/com/shanet/relayremote/NFC.java">my RelayRemote project</a> on GitHub.
