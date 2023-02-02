## Setup Guide
> We're using typescript here among other things, so some elbow grease is required, bear with us.

``` javascript
  //Install Dependencies
  > yarn

  /* Open two terminals. */

  /* First Terminal:     */
  > yarn dev

  /* Second Terminal */
  > yarn build:watch


  /* Important Note: */
```

For some reason, the tsc command doesn't emit the setup files and handlebar templates, so you'll have to manually move it over to the build folder, don't blame me, you're barking at the wrong tree.

<br />

> That's It, you're good to go!

## Facilities
> You'll be like a kid in a candy store once you hear all of our facilities and the convenience that they bring.

* Single File Routers (SFCs):
~ Create services within a single file, complete with validation, event-handler and controllers! available in both REST and WS protocols.
* MailMan: A nifty utility class for sending templated emails!
* Setup-Stages: A better way of writing setup scripts.
* Spaces and GSuite Support: Convenient way of accessing third-party SSaS.

*Note: Each facility has a pre-defined convention already in place, follow it or else!*

I'll elaborate those conventions later.