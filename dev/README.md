# PsyWeb Oslo Dev

Local webservice to develop experiments for Psyweb Oslo


## Setup

You will need to have [Node.js](https://nodejs.org/) installed.


### Windows

Run `run.bat`.

In your webbrowser (Chrome or Firefox), go to `http://localhost:8080/`.


### Linux / Mac OS

Test if Node.js is installed:
```
nodejs --version
npm --version
```

Start the webservice:
```
bash start.sh
```

In your webbrowser, go to `http://localhost:8080/`.


##  Create a new experiment


### Add files and directories

Place a new sub-folder inside the `experiments` folder. 
The folder name will be used as unique ID of the experiment.

Inside your `experiments/<sub-folder>` you will need a file `index.html`. 
This file will be called, when your experiment starts. 
Attention: Sometimes this file is called `experiment.html` in the jsPsych tutorials.

You can add more files and directories inside `experiments/<sub-folder>/`, 
if your experiment requires it.

In your webbrowser, go to `http://localhost:8080/` (refresh the page, if already open). 
Your shoud see your `<sub-folder>` in the list of experiments. 


### Support saving results

Inside your jsPsych experiment, define the `on_finish` function in 
`jsPsych.init` like this: 

```
  jsPsych.init({
    timeline: timeline,
    on_finish: function(data) {
      // save in PsyDev Oslo:
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = "../../save";
      const hiddenFieldUrl = document.createElement('input');
      hiddenFieldUrl.type = 'hidden';
      hiddenFieldUrl.name = "url";
      hiddenFieldUrl.value = window.location.pathname;
      form.appendChild(hiddenFieldUrl);
      const hiddenFieldResults = document.createElement('input');
      hiddenFieldResults.type = 'hidden';
      hiddenFieldResults.name = "results";
      hiddenFieldResults.value = data.json();
      form.appendChild(hiddenFieldResults);
      document.body.appendChild(form);
      form.submit();
    }
  });
```

If you don't use jsPsych, you can still use the above code. Replace 
`jsPsych.data.get().json()` with a stringified JSON conaining your results.

### Test

In your webbrowser, go to `http://localhost:8080/` and click "Test". 
Your experiment will start (`<sub-folder>/index.html` will be opened).

After the above JavaScript code gets executed by your experiment, 
you will be redirected to a page indicating the status of the test. 

If everything went well (meaning the results were transmitted correctly by your 
experiment), you will be able to download the results as JSON file.

### Export

In your webbrowser, go to `http://localhost:8080/` and click "Export". Your 
experiment will be exported to a file `<sub-folder>.zip` inside the `exports`
directory.



