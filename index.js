var app = require('express')();
var session = require('express-session');
var ringcentral = require('ringcentral');
var path = require('path')

app.use(session({ secret: 'somesecretstring', tokens: ''}));
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

// Sandbox
//const RINGCENTRAL_CLIENT_ID     = 'GOtM1yELTcqLASd9EHNn-A'
//const RINGCENTRAL_CLIENT_SECRET = '1OCoWTtJRPSSpkDpFxqp4g6LdLR8z0R-KejiMeci8ARg'
//const RINGCENTRAL_SERVER_URL    = 'https://platform.devtest.ringcentral.com'

// Production
const RINGCENTRAL_CLIENT_ID     = 'Bdt3Ed9PTPqCc7WGi6Pcrg'
const RINGCENTRAL_CLIENT_SECRET = 'uvTjYL-uSdOE9VSJh5L8ZgK6z70g30TV6nfr5QAF-pkA'
const RINGCENTRAL_SERVER_URL    = 'https://platform.ringcentral.com'
const ATT_SERVER_URL            = 'https://platform.ringcentral.biz'

//const RINGCENTRAL_REDIRECT_URL  = 'https://08a58deb.ngrok.io/oauth2callback'
const RINGCENTRAL_REDIRECT_URL  = 'http://localhost:5000/oauth2callback'

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

var server = require('http').createServer(app);
server.listen(5000);
console.log("listen to port 5000")

app.get('/index', function (req, res) {
  res.redirect("/")
})

app.get('/', function (req, res) {
    var platform = get_platform( req )
    if (req.session.tokens != undefined && platform.loggedIn()){
        return res.render('test')
    }
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
    res.render('index', {
        rc_authorize_uri: rc_url,
        att_authorize_uri: att_url
    });
})

app.get('/logout', function(req, res) {
    if (req.session.tokens != undefined) { // user has an auth context
	var platform = get_platform( req )
	if (platform.loggedIn()){
            platform.logout()
		.then(function(resp){
		    console.log("logged out")
		})
		.catch(function(e){
		    console.log(e)
		});
	}
	req.session.tokens = null
	req.session.state = null
    }
    res.redirect("/")
});

app.get('/oauth2callback', function(req, res) {
  if (req.query.code) {
      var state = req.query.state
      var platform = get_platform( req )
      platform.login({
          code: req.query.code,
          redirectUri: RINGCENTRAL_REDIRECT_URL
      })
      .then(function (token) {
          req.session.tokens = token.json()
          req.session.state = state
          res.redirect("/test")
      })
      .catch(function (e) {
          res.send('Login error ' + e);
      });
  }else {
      res.send('No Auth code');
  }
});

app.get('/test', function(req, res) {
    var platform = get_platform( req )
    if (platform.loggedIn()){
        if (req.query.api == "extension"){
            var endpoint = "/restapi/v1.0/account/~/extension";
            return callGetEndpoint(platform, endpoint, res)
        }else if (req.query.api == "extension-call-log"){
            var endpoint = "/restapi/v1.0/account/~/extension/~/call-log";
            return callGetEndpoint(platform, endpoint, res)
        }if (req.query.api == "account-call-log"){
            var endpoint = "/restapi/v1.0/account/~/call-log";
            return callGetEndpoint(platform, endpoint, res)
        }
    }
    res.redirect("/")
});

function callGetEndpoint(platform, endpoint, res){
    //console.log("Server URL: " + platform._server)
    platform.get(endpoint)
        .then(function(resp){
	    res.send(JSON.stringify(resp.json()))
	})
        .catch(function(e){
	    res.send("Error")
	})
}
