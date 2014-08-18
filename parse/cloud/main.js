
// Use Parse.Cloud.define to define as many cloud functions as you want.
// For example:
Parse.Cloud.define("hello", function(request, response) {
  getUser('Pugio').then(function (user) {
    response.success("Hello world!" + user.get('username'));
  });
});

function initializeUser(user) {
  user.set('sups_left', 11);
  user.set('sups_sent', 0);
}

Parse.Cloud.define("newUser", function (request, response) {
  var user = new Parse.User();
  user.set('username', request.params.username);
  user.set('password', 'password');

  initializeUser(user);

  user.signUp(null, {
    success: function (user) {
      response.success("Signed up!");
    },
    error: function (user, error) {
      response.error("" + error.code + ": " + error.message);
    }
  });
});


function getUser(username) {
  console.log("Getting: " + username + '|');
  var query = new Parse.Query(Parse.User);
  query.equalTo('username', username);

  var promise = new Parse.Promise();

  query.find().then(function (results) {
    console.log("Resolving:" + username + " " + results);
    promise.resolve(results[0]);
  }, function (error) {
    promise.reject(error);
  });

  return promise;
}

function pushSup(targetId, fromName) {
  var query = new Parse.Query(Parse.Installation);
  query.equalTo('userId', targetId);

  return Parse.Push.send({
    where: query, // Set our Installation query
    data: {
      alert: "'sup from " + fromName
    }
  });
}

function deliverSup(from, to) {
  return pushSup(to, from.get('username')).then( function() {
    Parse.Cloud.useMasterKey(); // get access privileges for modifying user
    from.increment('sups_sent');
    from.increment('sups_left', -1);
    return from.save();
  });
}

Parse.Cloud.define("supTo", function (request, response) {
  getUser(request.params.from).then(function (user) {
    return deliverSup(user, request.params.to);
  },
  function () {
    response.error("Could not find user: ", request.params.from);
  }).then(function () {
    response.success("sup sent from " + request.params.from + " to " + request.params.to);
  },
  function (error) {
    response.error("Something wrong: " + error.code + ":" + error.message);
  });
});
