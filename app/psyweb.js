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
const multer  = require('multer')
const upload = multer({ storage: multer.memoryStorage() })
const unzipper = require('unzipper');
const del = require('del');

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

var isAuthenticated = () => function(req, res, next) {
  if (req.session.username === undefined) {
    res.redirect('/login');
    return;
  }
  return next();
}
var isAdmin = () => function(req, res, next) {
  if (req.session.username != "admin") {
    res.redirect('/login');
    return;
  }
  return next();
}

//------------------------------------------------------------------------------

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
  '/exp', isAuthenticated(), [ 
    express.static(path.join(__dirname, g_expdir))
  ]
)

//------------------------------------------------------------------------------

var urlencodedParser = bodyParser.urlencoded({ extended: false })
// login

app.get('*', function(req, res, next) {
  res.locals.logged_in = (req.session.username !== undefined) ? true : false;
  next();
});
app.get('/login', function(req, res){
  res.render('login', { messages : [], authurl: '/login'});
});

app.post('/login', urlencodedParser, function(req, res) {
    let ok = true;
    ok = ok && req.body.password !== undefined;
    ok = ok && req.body.username !== undefined;
    ok = ok && req.body.password == 123;
    if (!ok) {
      res.redirect('/login_err');
      return;
    }
    req.session.username = req.body.username;
    if (req.session.username == "admin") {
      res.redirect('/admin');
      return;
    }
    res.redirect('/exp_list');
  }
);

app.get('/logout', function(req, res){
  req.session.username = undefined;
  res.redirect('/');
});


//------------------------------------------------------------------------------

app.get('/login_err', function(req, res){
  messages = [ 'Feil brukernavn eller passord, vennligst prøv på nytt.' ];
  res.render('err', { messages : messages} );
});

//------------------------------------------------------------------------------

app.get('/', function(req, res){
  res.render('main');
});

//------------------------------------------------------------------------------

app.get('/exp_list', isAuthenticated(), function(req, res) {
  let experiment_dirs = get_experiments_list();
  let experiments = experiment_dirs.map( function(dir) {
    return {
      name: dir,
      url: `exp/${dir}/index.html`
    };
  });
  res.render('exp_list', { experiments: experiments });
});


//------------------------------------------------------------------------------

const nettsjemaId = 141929;

app.post('/save', isAuthenticated(), urlencodedParser, function(req, res){
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
      res.render('ok', { messages: [ "Your data has been uploaded." ] });
      return;
    }).catch(err => { 
      console.log(`error: nettskjema not uploaded\n${err}`);
      res.render('err', { messages: [ "Your data could not be uploaded!", err ] });
      return;
    });
  });
});

//------------------------------------------------------------------------------

app.get('/admin', isAdmin(), function(req, res) {
  let experiment_dirs = get_experiments_list();
  res.render('admin', { experiment_ids: experiment_dirs });
});

//------------------------------------------------------------------------------

app.post('/upload_experiment', upload.single('experiment_zip'), async (req, res) => {
  const file = req.file;
  var originalname = "undefined";
  try {
    if (!file) {
      throw "Please upload a file";
    }
    originalname = req.file.originalname;
    if (! await is_valid_exeriment_zip(req.file.buffer)) {
      throw `Uploaded file (${req.file.originalname}) is not a valid experiment.`;
    }
    var experiment_id = await get_experiment_zip_id(req.file.buffer);
    if (fs.existsSync(path.join(__dirname, g_expdir, experiment_id))) {
      throw `Experiment '${experiment_id}' exists.`;
    }
    await extract_experiment_zip(req.file.buffer);
  } catch (e) {
    res.render('err', { back_url: "/admin", messages: [ `Error uploading file (${originalname}).`, e ] });
    return;
  }
  res.render('ok', { back_url: "/admin", messages: [ `Experiment '${experiment_id}' has been uploaded` ] });
})

//------------------------------------------------------------------------------


app.get('/confirm_remove_experiment', isAdmin(), function(req, res) {
  res.render('remove', { back_url: "/admin", experiment_id: req.query.id });
});

//------------------------------------------------------------------------------

app.get('/remove_experiment', isAdmin(), async function(req, res) {
  var experiment_id = "undefined";
  try {
    experiment_id = req.query.id;
    if (experiment_id === undefined || experiment_id == "") {
      throw "Undefined experiment ID.";
    }
    if (!fs.existsSync(path.join(__dirname, g_expdir, experiment_id))) {
      throw `Experiment '${experiment_id}' does not exist.`;
    }
    await del([ path.join(__dirname, g_expdir, experiment_id) ], {force: true});
  } catch (e) {
    res.render('err', { back_url: "/admin", messages: [ `Error removing experiment (${experiment_id}).`, e ] });
    return;
  }
  res.render('ok', { back_url: "/admin", messages: [ `Experiment '${experiment_id}' has been removed` ] });
});

//------------------------------------------------------------------------------

function is_valid_exeriment_zip(buffer) {
  return new Promise( async (resolve, reject) => {
    const directory = await unzipper.Open.buffer(buffer);
    directory.files.forEach( (e) => {
      const regex = /^[^\/]*\/index.html$/;
      if (e.path.match(regex)) {
        resolve(true);
      }
    });
    resolve(false);
  });
}

//------------------------------------------------------------------------------

async function get_experiment_zip_id(buffer) {
  return new Promise( async (resolve, reject) => {
    const directory = await unzipper.Open.buffer(buffer);
    directory.files.forEach( (e) => {
      const regex = /^[^\/]*\/index.html$/;
      if (e.path.match(regex)) {
        resolve(e.path.match(/^[^\/]*/)[0]);
      }
    });
    resolve(false);
  });
}

//------------------------------------------------------------------------------

function extract_experiment_zip(buffer) {
  return new Promise( async (resolve, reject) => {
    const directory = await unzipper.Open.buffer(buffer);
    directory.extract({ path: g_expdir }).then(() => resolve(true)).catch(err => { reject(err); });
  });
}

//------------------------------------------------------------------------------

function get_experiments_list() {
  // list all directories
  const isDirectory = source => fs.lstatSync(source).isDirectory();
  let files = fs.readdirSync(g_expdir)
    .filter(name => isDirectory(path.join(__dirname, g_expdir, name)))
    .sort();
  return files;
}

//------------------------------------------------------------------------------

function formatDateAsOutDir(date) {
  var month = '' + (date.getMonth() + 1);
  var year = date.getFullYear();
  if (month.length < 2) 
      month = '0' + month;
  return [year, month].join('-');
}
