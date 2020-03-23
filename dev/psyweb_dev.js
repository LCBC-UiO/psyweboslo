var httpPort = 8080;
var g_experimentdir = "./experiments";
var g_exportdir = "./export";

const express = require('express');
const app = express();
const http = require('http').Server(app);
const path = require('path');
const fs = require('fs');
const pug = require('pug');
const bodyParser = require('body-parser');
const session = require('express-session');
const archiver = require('archiver');
const dotenv = require('dotenv').config({ path: './config.txt' })

//------------------------------------------------------------------------------

// make env vars available in pug
app.locals.env = process.env

var urlencodedParser = bodyParser.urlencoded({ extended: false })
// login

//------------------------------------------------------------------------------

// listen
http.listen(httpPort, () => {
	console.log('HTTP listening on *:' + httpPort);
});

//------------------------------------------------------------------------------

app.use(express.json());

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
  '/exp', [ 
    express.static(path.join(__dirname, g_experimentdir))
  ]
)

//------------------------------------------------------------------------------

app.get('/', async function(req, res) {
  let experiment_dirs = await get_experiments_list();
  let experiments = experiment_dirs.map( function(dir) {
    return {
      name: dir,
      url: `exp/${dir}/index.html`
    };
  });
  res.render('exp_list_dev', { experiments: experiments });
});

//------------------------------------------------------------------------------

app.post('/save', urlencodedParser, async function(req, res){
  // we are parsing the dir name of the experiment from the url
  // ( "/exp/brief-self-control-survey/index.html" => "brief-self-control-survey" )
  while (true) {
    // url provided?
    if (req.body.url === undefined) {
      messages = [ `Field "url" is missing.` ];
      break;
    }
    const taskname = req.body.url.replace(/^\/exp\//g, '').replace(/\/[^\/]*.html$/g, '');
    // json provided?
    const json_str = req.body.results;
    if (json_str === undefined) {
      messages = [ `Field "results" is missing in response from '${taskname}'.` ];
      break;
    }
    try {
      JSON.parse(json_str);
    } catch(e) {
      messages = [ 
        `Field "results" is not in JSON format (from '${taskname}').`
        , e
      ];
    }
    // task is directory
    const task_dir = path.join(g_experimentdir, taskname)
    if (!fs.existsSync(task_dir) || ! await is_directory_or_link(task_dir)) {
      messages = [ `Experiment '${taskname}' not found (most likely an internal error).` ];
      break;
    }
    console.log(json_str);
    res.render('save_ok', { experiment_name: taskname, json: JSON.stringify(json_str) });
    return;
  }
  res.render('err', { messages: messages });
});

//------------------------------------------------------------------------------

app.get('/export', function(req, res){
  const experiment_id = req.query.name;
  var output = fs.createWriteStream(path.join( __dirname, g_exportdir, `${experiment_id}.zip`));
  var archive = archiver('zip');

  output.on('close', function () {
    const message = `Your experiment has been exported to "${experiment_id}.zip" in "${g_exportdir}/"`
    res.render('export_ok', { message: message });
  });

  archive.on('error', function(err){
    res.render('err', { messages: [ err ] });
  });

  archive.pipe(output);
  archive.directory(path.join(g_experimentdir, experiment_id), experiment_id);
  archive.finalize();
});

//------------------------------------------------------------------------------

function is_directory_or_link(p) {
  return new Promise( async (resolve, reject) => {
    fs.lstat(p, function (err, stats) {
      if (err) {
        reject();
      }
      // get one level up and join symlink (expected to be relative)
      p = stats.isSymbolicLink(p) ? path.join(path.dirname(p).split(path.sep).pop(), fs.readlinkSync(p)) : p;
      resolve(fs.lstatSync(p).isDirectory());
    });
  });
}

async function get_experiments_list() {
  // list all directories
  const isDirectory = source => fs.lstatSync(source).isDirectory();
  let files = fs.readdirSync(g_experimentdir)
    .filter( async function(name) { return await is_directory_or_link(path.join(g_experimentdir, name))})
    .sort();
  return files;
}

