



var http = require('http');
var fs = require('fs');
var path = require('path');
var ext = /[\w\d_-]+\.[\w\d]+$/;
var util = require("util");


		 

Object.prototype.startsWith = function (sought) {
    return (this.substr(0,sought.length)==sought);
}


Object.prototype.endsWith = function (sought) {
    return (this.substr(this.length-sought.length)==sought);
}



Object.prototype.removeStart = function (start) {
    return (this+"").substr(start.length);
}


Object.prototype.contains = function (sought) {

    return ( (this+"").indexOf(""+sought) >= 0 );

}


var dump=util.inspect;



function getContentType(someFile) {
    someFile = ""+someFile;
    if (someFile.endsWith('.html')) return  'text/html';
    if (someFile.endsWith('.htm' )) return 'text/html';
    if (someFile.endsWith('.js'  )) return 'script/javascript';
	return 'text/plain';
}


function getFilePath(relPath) {
    return "."+relPath;
}


var users = {};


function doApi(req,res) {
    console.log('api-' + req.method + "   " + req.url);

    var url = ""+req.url;

    if (req.method=='GET') {
	if (url=="/api/user/") {
	    bugbug("send back a list of all current users");	
	} else if (url.startsWith("/api/user/")) {
	    var userName = url.removeStart("/api/user/");
	    if (users[userName]) {
		res.writeHead(200, {'Content-Type': 'application/json'});
		res.end(users[userName]);
	    } else { //don't have
		res.writeHead(404, {'Content-Type': 'application/json'});
		res.end('{response:"nothing found"}\n');    
	    }
	} else {
	    res.writeHead(404, {'Content-Type': 'application/json'});
	    res.end('{response:"unknown api--'+req.url+'"}\n');    
	}
//    } else if (req.method=='POST') {
//
//	res.writeHead(404,  {'Content-Type': 'application/json'});
//	res.end('{response:"POST NYI--'+req.method+'"}\n');    
//
    } else if (req.method=='PUT') {
	//console.log(dump(req));
	if (url.startsWith("/api/user/")) {
	    var userName = url.removeStart("/api/user/");
	    var body='';
	    req.on('data',function(data){
		body+=data;
	    });
	    req.on('end',function(){
		console.log("body="+body);
		users[userName]=body;
		res.writeHead(200,  {'Content-Type': 'application/json'});
		res.end('{response:"putOK"}\n');    //bugbug think we need to return id
	    });
	} else {
	    res.writeHead(404,  {'Content-Type': 'application/json'});
	    res.end('{response:"err328s:cannot PUT '+url+'"}');
	}
	
    } else {
	res.writeHead(404,  {'Content-Type': 'application/json'});
	res.end('{response:"unknown http method--'+req.method+'"}\n');    
    }
    


}



function doFancyApi(req,res) {    // strip off ?foo=bar so that the file can be served statically //

    console.log('fancy req-'+req.url);

    var filePath = ""+req.url;
    filePath = filePath.substr(0,filePath.lastIndexOf("?"));
    filePath = path.join(__dirname, filePath);
    return doStaticBase(filePath,res);

    //res.writeHead(200, {'Content-Type': 'application/json'});
    //res.end('Hello World - fancyApi\n');    

}



function doStaticBase(filePath, res) {
    fs.exists(filePath, function (exists) {
	if (exists) {
	    console.log("found:"+filePath);
	    res.writeHead(200, {'Content-Type': getContentType(filePath)});
            fs.createReadStream(filePath).pipe(res);
        } else {
	    console.log("lost:"+filePath);
            res.writeHead(404, {'Content-Type': 'text/html'});
	    res.end("404 error:"+filePath);
        }
    });
}


function doStatic(req,res) {

    if (!ext.test(req.url))  {
	res.end("err257a---api no longer supported under /web");
	return;
    }

    var filePath = path.join(__dirname, req.url);
    return doStaticBase(filePath,res);
}


function doStaticRedir(req,res) {

    if (!ext.test(req.url))  {
	res.end("err257b");
	return;
    }
    
    var filePath = path.join(__dirname,"web", req.url);
    return doStaticBase(filePath,res);
}



//     } else if (ext.test(req.url)) {
//         fs.exists(path.join(__dirname, req.url), function (exists) {
//             if (exists) {
//                 res.writeHead(200, {'Content-Type': 'text/html'});
//                 fs.createReadStream('index.html').pipe(res);
//             } else {
//                 res.writeHead(404, {'Content-Type': 'text/html'});
//                 fs.createReadStream('404.html').pipe(res);
//             }








http.createServer(function (req, res) {

    debugger;

    var path=""+req.url;


    //console.log(path);

    if (path.startsWith("/api/")) {

		return doApi(req,res);

    } else if (path.contains("?")) {

		return doFancyApi(req,res);

    } else if (path.startsWith("/web/")) {

		return doStatic(req,res);

    } else if (path=="/favicon.ico") {

		return doStaticRedir(req,res);

    } else {
		console.log("err320:"+path);  //these tend to become static redir

		res.writeHead(200, {'Content-Type': 'text/plain'});
		res.end('Hello World---base\n');
		return;
    }

}).listen(8081);

// Console will print the message
console.log('Server running at http://127.0.0.1:8081/');
