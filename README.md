# RingCentral Partner Compatibility Sample App

This repository contains a sample application to help illustrate how to build a RingCentral application that supports RingCentral as well as AT&T Office@Hand customers. This app is a slight modification of the [RingCentral Authentication Quick Start Guide for Javascript] and demonstrates how one can address the unique needs of an Office@Hand compatible application.

## Office@Hand's Special Requirements

AT&T Office@Hand is a cloud communication service powered by RingCentral. Developers can build apps for the Office@Hand platform just as they would a typical RingCentral app, with one major caveat:

**Office@Hand requires developers to direct API calls to different URL endpoint.**

Where RingCentral apps direct calls to platform.ringcentral.**com**. Office@Hand apps direct calls to platform.ringcentral.**biz**.

## Solution Overview

The following highlights the code changes one would need to make to the standard OAuth Quick Start to meet these requirements, and provides a good context in which to discuss the approach.

### index.js, lines 24-33

```javascript
var rcsdk = new ringcentral({
  server:    RINGCENTRAL_SERVER_URL,
  appKey:    RINGCENTRAL_CLIENT_ID,
  appSecret: RINGCENTRAL_CLIENT_SECRET
});
var attsdk = new ringcentral({
  server:    ATT_SERVER_URL,
  appKey:    RINGCENTRAL_CLIENT_ID,
  appSecret: RINGCENTRAL_CLIENT_SECRET
});
```

In the code above we instantiate two different SDKs, one for regular RingCentral customers, and the other for Office@Hand customers.

### index.js, lines 35-49

```javascript
function get_platform( req ) {
    var platform
    if (req.session.tokens != undefined) { // user has an auth context
        var tokensObj = req.session.tokens
	if (req.session.state == 'biz') {
	    platform = attsdk.platform()
	} else {
	    platform = rcsdk.platform()
	}
	platform.auth().setData(tokensObj)
    } else {
	platform = rcsdk.platform()
    }
    return platform
}
```

We add the `get_platform` helper function to process a request to determine which SDK object to invoke to get a handle on the corresponding `platform` object. To do this, we check the current user's session in which we stash their `state` which records which service they belong to.

In your own implementation, you may wish to persist this information in the user's profile or in a local database.

### index.js, lines 64-73

```javascript
    rc_url = rcsdk.platform().loginUrl({
        brandId: '',
	state: 'com',
        redirectUri: RINGCENTRAL_REDIRECT_URL
    })
    att_url = attsdk.platform().loginUrl({
        brandId: '7310',
	state: 'biz',
        redirectUri: RINGCENTRAL_REDIRECT_URL
    })
```

When constructing the login URLs to initiate the OAuth flow, you invoke the respective `loginUrl` methods on the two SDKs. In constructing these URLs it is important to draw attention to:

* The `state` parameter passes one value for RC users, and another for AT&T users. The value of this field will be returned to your application in a subsequent redirect.
* The `brandId` parameter is set properly in order to display the AT&T Office@Hand logo on the login screen.

### index.js, lines 106-110

```javascript
      .then(function (token) {
          req.session.tokens = token.json()
          req.session.state = state
          res.redirect("/test")
      })
```

Finally, when we process the redirect after authorization is complete, we stash the `state` parameter in our session. This will allow us to detect in subsequent requests whether the logged in user is an AT&T or RingCentral customer. Knowing this allows us to direct our API requests to the proper URL. As mentioned before, you may wish to persist this information is a database, rather than a session. 
