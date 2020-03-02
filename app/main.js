var httpPort = 9080;
var g_expdir = "../experiments";
var g_restmpdir = '../out/results_tmp';
var g_resultdir = '../out/results';


const argv = require('yargs').argv;
const express = require('express');
const app = express();
const http = require('http').Server(app);
const path = require('path');
const fs = require('fs');
const pug = require('pug');
const bodyParser = require('body-parser');
const session = require('express-session');
const dotenv = require('dotenv').config({ path: '../config.txt' })

const nettsjema = require('./nettskjema');


// make env vars available in pug
app.locals.env = process.env

//------------------------------------------------------------------------------

if (typeof argv.httpPort != 'undefined') {
	httpPort = argv.httpPort;
}

//------------------------------------------------------------------------------

app.use(express.json());
app.use(session({
  secret: 'xyz', 
  saveUninitialized: true,
  resave: true
})); //TODO

// listen
http.listen(httpPort, () => {
	console.log('HTTP listening on *:' + httpPort);
});

//------------------------------------------------------------------------------

//------------------------------------------------------------------------------

var isAuthenticated = redirectUrl => function(req, res, next) {
  if (req.session.username === undefined) {
    res.redirect('/login');
    return;
  }
  return next();
}

app.set('view engine', 'pug')
app.set(
  'views', [
    path.join(__dirname, './views'), 
    path.join(__dirname, '../shared/views')
  ]
)
app.use(
  '/img', [
    express.static(path.join(__dirname, './img')),
    express.static(path.join(__dirname, '../shared/img'))
  ]
)
app.use(
  '/css', [ 
    express.static(path.join(__dirname, './css')), 
    express.static(path.join(__dirname, '../shared/css'))
  ]
)
app.use(
  '/exp', isAuthenticated('/login'), [ 
    express.static(path.join(__dirname, g_expdir))
  ]
)


//------------------------------------------------------------------------------

//------------------------------------------------------------------------------

// define urls

//------------------//

var urlencodedParser = bodyParser.urlencoded({ extended: false })
// login

app.get('/login', function(req, res){
  res.render('login', { messages : [], authurl: '/login'});
});

app.post('/login', 
  urlencodedParser,
  function(req, res){
    let ok = true;
    ok = ok && req.body.password !== undefined;
    ok = ok && req.body.username !== undefined;
    ok = ok && req.body.password == 123;
    if (!ok) {
      res.redirect('/login_err');
      return;
    }
    req.session.username = req.body.username;
    res.redirect('/exp_list');
  }
);

app.get('/login_err', function(req, res){
  messages=[{type: 'error', text: 'Feil brukernavn eller passord, vennligst prøv på nytt.' }]
  res.render('back', { messages : messages} );
});


app.get('/', function(req, res){
  res.render('main');
});


app.get('/exp_list', isAuthenticated('/login'), function(req, res) {
  let experiment_dirs = get_experiments_list();
  let experiments = experiment_dirs.map( function(dir) {
    return {
      name: dir,
      url: `exp/${dir}/index.html`
    };
  });
  res.render('exp_list', { experiments: experiments });
});


const nettsjemaId = 141929;

app.post('/save', isAuthenticated('/login'), urlencodedParser, function(req, res){
  // we are parsing the dir name of the experiment from the url
  // ( "/exp/brief-self-control-survey/index.html" => "brief-self-control-survey" )
  let taskname = req.body.url.replace(/^\/exp\//g, '').replace(/\/index.html$/g, '');
  const json = req.body.results;
  const subj_id = req.session.username;
  // write results
  var date = new Date()
  datestr = date.toISOString().replace(/:/g, '.');
  let filename = taskname + "_" + subj_id + "_" + datestr + ".json";
  var restmp_fn = path.join(__dirname, g_restmpdir, filename);
  fs.writeFile(restmp_fn, json, 'utf8',  function() {
    console.log(`created file ${restmp_fn}`);
    let out = new Map();
    out["subj_id"] = subj_id;
    out["timestamp"] = date.toISOString();
    out["experiment_id"] = taskname;
    out["data_json"] = json;
    nettsjema.upload(nettsjemaId, out).then( () => {
      // move results to final output dir
      outdir = path.join(__dirname, g_resultdir, formatDateAsOutDir(date))
      if (!fs.existsSync(outdir)){
        fs.mkdirSync(outdir);
      }
      fs.renameSync(restmp_fn, path.join(outdir, filename));
      res.render('save_ok');
      return;
    }).catch(err => { 
      console.log(`error: nettskjema not uploaded\n${err}`);
      res.render('save_err', { messages: [ err ] });
      return;
    });
  });
});


app.get('/wordlist', isAuthenticated('/login'), function(req, res){
  let taskindex = parseInt(req.query.taskindex, 10);
  if (isNaN(taskindex) || taskindex < 0 || taskindex+1 > tasks.length ) {
    res.send(`error: invalid taskindex - ${req.query.taskindex}`);
    return;
  }
  res.render('wordlist', {tasks: tasks, taskindex: taskindex, messages: []});
});

app.get('/test', isAuthenticated('/login'), function(req, res){
  let taskindex = parseInt(req.query.taskindex, 10);
  if (isNaN(taskindex) || taskindex < 0 || taskindex+1 > tasks.length ) {
    res.send(`error: invalid taskindex - ${req.query.taskindex}`);
    return;
  }
  let trainingTimeSec = parseInt(req.query.trainingTimeSec, 10);
  if (isNaN(trainingTimeSec) || trainingTimeSec < 0) {
    res.send(`error: invalid trainingTimeSec - ${req.query.trainingTimeSec}`);
    return;
  }
  res.render('test', {
    tasks: tasks,
    taskindex: taskindex,
    trainingTimeSec: trainingTimeSec,
    messages: []
  });
});

app.post('/test', isAuthenticated('/login'), urlencodedParser, function(req, res){
  let taskindex = parseInt(req.body.taskindex, 10);
  if (isNaN(taskindex) || taskindex < 0 || taskindex+1 > tasks.length ) {
    res.send(`error: invalid taskindex - ${req.query.taskindex}`);
    return;
  }
  let trainingTimeSec = parseInt(req.query.trainingTimeSec, 10);
  if (isNaN(trainingTimeSec) || trainingTimeSec < 0) {
    res.send(`error: invalid trainingTimeSec - ${req.query.trainingTimeSec}`);
    return;
  }
  // parse answers from JSON 
  let answers = tasks[taskindex].words.map(function(x, index) {
    return req.body["answer"+index];
  });
  res.render('result', {
    tasks: tasks, 
    taskindex: taskindex, 
    answers: answers,
    messages: []
  });
  writeAnswers(answers, req.session.username, tasks[taskindex].taskid, trainingTimeSec);
});


function get_experiments_list() {
  // list all directories
  const isDirectory = source => fs.lstatSync(source).isDirectory();
  let files = fs.readdirSync(g_expdir)
    .filter(name => isDirectory(path.join(g_expdir, name)))
    .sort();
  return files;
}


function formatDateAsOutDir(date) {
  var month = '' + (date.getMonth() + 1);
  var year = date.getFullYear();
  if (month.length < 2) 
      month = '0' + month;
  return [year, month].join('-');
}
