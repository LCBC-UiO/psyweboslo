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
const dotenv = function() {
  if (fs.existsSync("../config.txt")) {
    return require('dotenv').config({ path: '../config.txt' })
  }
  return require('dotenv').config({ path: '../config_default.txt' })
}();
const multer  = require('multer')
const upload = multer({ storage: multer.memoryStorage() })
const unzipper = require('unzipper');
const del = require('del');
const crypto = require('crypto');

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

var requireSubjId = () => function(req, res, next) {
  while (true) {
    // provided in url?
    const regex = /^[A-Za-z0-9]{4,}$/;
    var ok = true;
    ok = ok && req.query.uid !== undefined;
    ok = ok && req.query.uid.match(regex);
    if (ok) {
      req.session.subjid = req.query.uid;
      break;
    }
    // already set?
    if (req.session.subjid !== undefined) {
      break;
    }
    // no subjid -> redirect
    res.redirect('/username');
    return;
  }
  return next();
}

var requireAdmin = () => function(req, res, next) {
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
  '/exp', requireSubjId(), [ 
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
    ok = ok && req.body.username == "admin"; // only admin for now
    ok = ok && req.body.password == app.locals.env.ADMINPW;
    if (!ok) {
      res.redirect('/login_err');
      return;
    }
    req.session.username = "admin";
    res.redirect('/admin');
    return;
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

app.get('/username', urlencodedParser, function(req, res) {
  res.render('username');
});

//------------------------------------------------------------------------------

app.get('/', function(req, res) {
  res.render('main');
});

//------------------------------------------------------------------------------

app.get('/exp_list', requireSubjId(), function(req, res) {
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

app.get('/start', requireSubjId(), function(req, res) {
  if (req.query.inf !== undefined) {
    req.session.info_json = req.query.inf;
  }
  if (req.query.back !== undefined) {
    req.session.back_url = req.query.back;
  }
  
  if (req.query.eid !== undefined) {
    res.redirect(`exp/${req.query.eid}/index.html`);
    return;
  }
  res.render('err', { messages: [ "Experiment ID (eid) was not defined in URL." ] });
});

//------------------------------------------------------------------------------

app.post('/save', requireSubjId(), urlencodedParser, async function(req, res) {
  const nettsjemaId = app.locals.env.NETTSKJEMAID;
  // we are parsing the dir name of the experiment from the url
  // ( "/exp/brief-self-control-survey/index.html" => "brief-self-control-survey" )
  let taskname = req.body.url.replace(/^\/exp\//g, '').replace(/\/[^\/]*.html$/g, '');
  const json = req.body.results;
  // write results
  var date = new Date()
  datestr = date.toISOString().replace(/:/g, '.');
  // list dir
  const taskpath = path.join(__dirname, g_expdir, taskname);
  const taskmd5 = await get_dir_md5(taskpath);
  const taskdate = fs.lstatSync(taskpath).mtime.toISOString();

  let filename = taskname + "_" + req.session.subjid + "_" + datestr + ".json";
  var restmp_fn = path.join(__dirname, g_restmpdir, filename);
  let out = new Map();
  out["subj_id"] = req.session.subjid;
  out["timestamp"] = date.toISOString();
  out["experiment_id"] = taskname;
  out["experiment_md5"] = taskmd5;
  out["experiment_date"] = taskdate;
  out["info_json"] = req.session.info_json;
  out["data_json"] = json;
  fs.writeFile(restmp_fn, JSON.stringify(out), 'utf8',  function() {
    console.log(`created file ${restmp_fn}`);
    nettsjema.upload(nettsjemaId, out).then( () => {
      // move results to final output dir
      outdir = path.join(__dirname, g_resultdir, formatDateAsOutDir(date))
      if (!fs.existsSync(outdir)) {
        fs.mkdirSync(outdir);
      }
      fs.renameSync(restmp_fn, path.join(outdir, filename));
      // reset subjid - workaround
      const back_url = req.session.back_url;
      req.session.destroy();
      res.render('ok', { messages: [ "Test completed." ], back_url: back_url });
      return;
    }).catch(err => { 
      console.log(`error: nettskjema not uploaded\n${err}`);
      res.render('err', { messages: [ "Your data could not be uploaded!", err ] });
      return;
    });
  });
});

//------------------------------------------------------------------------------

app.get('/admin', requireAdmin(), function(req, res) {
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


app.get('/confirm_remove_experiment', requireAdmin(), function(req, res) {
  res.render('remove', { back_url: "/admin", experiment_id: req.query.id });
});

//------------------------------------------------------------------------------

app.get('/remove_experiment', requireAdmin(), async function(req, res) {
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

//------------------------------------------------------------------------------

function get_dir_md5(path) {
  return new Promise( async (resolve, reject) => {
    _list_files_dir(path, function(err, results) {
      if (err) reject();
      results.sort();
      var md5sum = crypto.createHash('md5');
      results.forEach( (e) => {
        var data = fs.readFileSync(e);
        md5sum.update(data);
      });
      resolve(md5sum.digest('hex'));
    });
  });
}

var _list_files_dir = function(dir, done) {
  var results = [];
  fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    var i = 0;
    (function next() {
      var file = list[i++];
      if (!file) return done(null, results);
      file = path.resolve(dir, file);
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          _list_files_dir(file, function(err, res) {
            results = results.concat(res);
            next();
          });
        } else {
          results.push(file);
          next();
        }
      });
    })();
  });
};