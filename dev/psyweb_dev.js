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

app.get('/', function(req, res){
  let experiment_dirs = get_experiments_list();
  let experiments = experiment_dirs.map( function(dir) {
    return {
      name: dir,
      url: `exp/${dir}/index.html`
    };
  });
  res.render('exp_list_dev', { experiments: experiments });
});

//------------------------------------------------------------------------------

app.post('/save', urlencodedParser, function(req, res){
  // we are parsing the dir name of the experiment from the url
  // ( "/exp/brief-self-control-survey/index.html" => "brief-self-control-survey" )
  while (true) {
    // url provided?
    if (req.body.url === undefined) {
      messages = [ `Field "url" is missing.` ];
      break;
    }
    const taskname = req.body.url.replace(/^\/exp\//g, '').replace(/\/index.html$/g, '');
    // json provided?
    const json = req.body.results;
    if (json === undefined) {
      messages = [ `Field "results" is missing in response from '${taskname}'.` ];
      break;
    }
    try {
      JSON.parse(json);
    } catch(e) {
      messages = [ 
        `Field "results" is not in JSON format (from '${taskname}').`
        , e
      ];
    }
    // task is directory
    const task_dir = path.join(g_experimentdir, taskname)
    if (!fs.existsSync(task_dir) || !fs.lstatSync(task_dir).isDirectory()) {
      messages = [ `Experiment '${taskname}' not found (most likely an internal error).` ];
      break;
    }
    res.render('save_ok', { experiment_name: taskname });
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

function get_experiments_list() {
  // list all directories
  const isDirectory = source => fs.lstatSync(source).isDirectory();
  let files = fs.readdirSync(g_experimentdir)
    .filter(name => isDirectory(path.join(g_experimentdir, name)))
    .sort();
  return files;
}

