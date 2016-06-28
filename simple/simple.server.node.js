



var http = require('http');
var fs = require('fs');
var path = require('path');
var ext = /[\w\d_-]+\.[\w\d]+$/;
var util = require("util");

//bugbug move this all to a wrapFs module


var functionExists = function(f) {
    return (typeof f === 'function');
};



var fsExists = function (filePath, callback) {
    debugger;
    if ( functionExists( fs.exists ) ) 
	return fs.exists( filePath, callback );
    if ( functionExists( fs.access ) )
	return fs.access(  filePath, fs.R_OK,  function(err){ callback(!err); }  );
    console.log("err1122i:");
};




// var fsAccess
//     fs.access(filePath, fs.R_OK, function (err) {
// 	if (err) {
// 	    console.log("condition1923:"+err);
// 	    callback(false);
// 	} else {
// 	    callback(true);
// 	}
//     });
    

// };








		 

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
function getUserList() {
    return JSON.stringify(users); 
}

function doApi(req,res) {
    console.log('api-' + req.method + "   " + req.url);

    if (req.method=='GET') {
		return doGet(req,res);
	} else if (req.method=='PUT') {
		return doPut(req,res);
	} 
	//else if (req.method=='POST') doPost();
	else {    
		return unknownMethod(req,res);
	}
}
	
function doGet(req,res) {
	var url = ""+req.url;
	if (url=="/api/user/") {
	    writeNormalHead(res);
	    var userList = getUserList();
            console.log(userList);  //bugbug
            res.end(userList);
	} else if (url.startsWith("/api/user/")) {
	    var userName = url.removeStart("/api/user/");
		if (users[userName]) {
			writeNormalHead(res);
			res.end(users[userName]);
	    } else { //don't have
			res.writeHead(404, {'Content-Type': 'application/json'});
			res.end('{response:"nothing found"}\n');    
	    }
	} else {
	    res.writeHead(404, {'Content-Type': 'application/json'});
	    res.end('{response:"unknown api--'+req.url+'"}\n');    
	}
}	

function unknownMethod(req,res) {
	res.writeHead(404,  {'Content-Type': 'application/json'});
	res.end('{response:"unknown http method--'+req.method+'"}\n');    
}
    
	
	
//function doPost(req,res) {	
//  
//
//	res.writeHead(404,  {'Content-Type': 'application/json'});
//	res.end('{response:"POST NYI--'+req.method+'"}\n');    
// }
    
	
	
function doPut(req,res) {
	var url = ""+req.url;
	
	if (url.startsWith("/api/user/")) {
		var userName = url.removeStart("/api/user/");
		var body='';
		req.on('data',function(data){
		    body+=data;
		});
		req.on('end',function(){
		    console.log("body="+body);
		    users[userName]=body;
                    console.log("wrote user="+userName+" "+dump(users));
		    writeNormalHead(res);
		    res.end('{"response":"putOK"}\n');    //bugbug think we need to return id
		});
	} else {
		res.writeHead(404,  {'Content-Type': 'application/json'});
		res.end('{response:"err328s:cannot PUT '+url+'"}');
	}
}



function writeNormalHead(res)  {   //response; 
	res.writeHead(200, {'Content-Type': 'application/json'});
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
    fsExists(filePath, function (exists) {
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
//         fsExists(path.join(__dirname, req.url), function (exists) {
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

