//CirroNimble Upload module
//Combination page and site uploader; how CirroNimble users will upload pages and sites the first time, and also update them later.


//Examples
//xhrRequest("GET","http://upload.com",function($cb){cje("nav2ddc",JSON.parse($cb))})
//xhrRequest("GET","http://localhost:5004",function($cb){cje("nav2ddc",JSON.parse($cb))})
//xhrRequest('POST','http://localhost:5004/update?username=' + findCookieByName("username")+ '&SessionID=' + findCookieByName("SessionID")+ '&SessionKey=' + findCookieByName("SessionKey"),function($cb){document.cookie = "username="+$cb.split(":")[0];document.cookie = "SessionID="+$cb.split(":")[1];document.cookie = "SessionKey="+$cb.split(":")[2]});
//xhrRequest('POST','http://localhost:5004/update?username=' + findCookieByName("username")+ '&SessionID=' + findCookieByName("SessionID")+ '&SessionKey=' + findCookieByName("SessionKey")+'&elements=' + readElement("uploadableTextArea"),function($cb){console.log($cb)});

//{ Init vars
var $http = require("http");
var $serviceName = "Upload";
var $servicePort = (process.env.PORT || 5004);
var $hostName = (process.env.HOST || "localhost:"+$servicePort);
var Sequelize = require("sequelize");
sequelize = new Sequelize(process.env.DATABASE_URL || 'postgres://postgres:dbpasswd@127.0.0.1:5432/postgres', {logging: false});
//}

//{ functions
String.prototype.octEncode = function(){
    var hex, i;
 
    var result = "";
    for (i=0; i<this.length; i++) {
        hex = this.charCodeAt(i).toString(8);
        result += ("000"+hex).slice(-4);
    }
 
    return result
}
String.prototype.octDecode = function(){
    var j;
    var hexes = this.match(/.{1,4}/g) || [];
    var back = "";
    for(j = 0; j<hexes.length; j++) {
        back += String.fromCharCode(parseInt(hexes[j], 8));
    }
 
    return back;
}
function swimmersEncode($swimmers){
    return $swimmers .octEncode().replace(/0/g,"~-~ ").replace(/1/g,"-~- ").replace(/2/g,"   ").replace(/3/g,"O_|").replace(/4/g,"o__").replace(/5/g,"o,").replace(/6/g,"o_").replace(/7/g,",")
}
function swimmersDecode($swimmers){
    return $swimmers.replace(/\~-~ /g,0).replace(/-~- /g,1).replace(/   /g,2).replace(/O_\|/g,3).replace(/o__/g,4).replace(/o,/g,5).replace(/o\_/g,6).replace(/,/g,7).octDecode() 
}var $page_views = 0;

function refreshKey($user) {
	var $outkey = {}
	$sessionID = getBadPW()
	$sessionKey = getBadPW()
	$output = ""+$user+":" + $sessionID +":" + $sessionKey 
	sequelize.query("UPDATE Sessions SET logintime = current_timestamp, sessionid = '"+$sessionID+"', sessionkey = '"+$sessionKey+"' WHERE sessionuser='"+$user+"';INSERT INTO Sessions (sessionuser, sessionid,sessionkey) SELECT '"+$user+"','"+$sessionID+"','"+$sessionKey+"' WHERE NOT EXISTS (SELECT 1 FROM Sessions WHERE sessionuser='"+$user+"');")
	return $user + ":" + $sessionID + ":" + $sessionKey
};


function getBadPW() { return Math.random().toString(36).slice(-20).slice(2); };
function writeLog($msg) { 
	$msg = $msg.toString().replace(/'/g,"~~")
	if($msg.length > 254) {
	   $msg = $msg.substring(0, 251)+"...";
	}
	sequelize.query("INSERT INTO Logs (servicename, err) SELECT '"+$serviceName+"','"+$msg+"'").then(([$PagesResults, metadata]) => {
	}).catch(function(err) {
		console.log('writeLog Insert error: '); 
		console.log(err); 
	}) //	.then()
};
//}

//{ Upload
$http.createServer(function (request, response) {
	response.setHeader('Access-Control-Allow-Origin', "*")
	try {
	writeLog(request.method +"request from address:" + request.connection.remoteAddress + " on path: "+request.connection.remotePort+" for path " + request.url)
if (request.method == "GET") {
//Change to upload textarea and button
    $postArea = { "elements": [{"id":"uploadWrapper","elementParent":"parentElement","elementClass":"$_.classes.ContentRow","innerText":"upload","attributeType":"method","attributeAction":"post"},{"id":"uploadableTextArea","elementParent":"uploadWrapper","elementClass":"$_.classes.FullDesktopFullMobile","elementType":"textarea"},{"id":"uploadBtnRow","elementParent":"uploadWrapper"},{"elementParent":"uploadBtnRow","innerText":"Upload","elementClass":"btn btn-primary","elementType":"button","onClick":"xhrRequest('POST','http://"+$hostName+"/upload?username=' + findCookieByName('username')+ '&SessionID=' + findCookieByName('SessionID')+ '&SessionKey=' + findCookieByName('SessionKey')+'&elements=' + readElement('uploadableTextArea').replace(/#/g,'~~'),function($cb){if ($cb.split(':')[0] == findCookieByName('username')){document.cookie = 'SessionID='+$cb.split(':')[1];document.cookie = 'SessionKey='+$cb.split(':')[2]}});"}] };
	response.end(JSON.stringify($postArea)) 
} else if (request.method == "POST") {

	//console.log(request.url); 
	var $user = request.url.split("/upload?")[1].split("&")[0].split("=")[1]
	var $sessionID = request.url.split("/upload?")[1].split("&")[1].split("=")[1]
	var $sessionKey = request.url.split("/upload?")[1].split("&")[2].split("=")[1]
	var $JsonUpload = request.url.split("/upload?")[1].split("&")[3].split("=")[1]
	$JsonUpload = $JsonUpload.replace(/~~/g,"#")
	$JsonUpload = $JsonUpload.replace(/%20/g,'')
	$JsonUpload = $JsonUpload.replace(/%22/g,'"')
	//console.log('elements: '); 
	//console.log($JsonUpload); 
	$JsonUpload = JSON.parse($JsonUpload)

	if (request.url.length > 28) {
	if (typeof $JsonUpload.jmlVersion == "undefined") {//upload page
		if (typeof $user !== "undefined" & typeof $sessionID !== "undefined" & typeof $sessionKey !== "undefined") {
			$sessionID = $sessionID.replace(/;/g,"")
	sequelize.query("SELECT sessionuser FROM Sessions WHERE sessionid = '"+$sessionID+"';").then(([$SessionResults, metadata]) => {
		if ($user==$SessionResults[0].sessionuser) {

		sequelize.query("INSERT INTO Pages (pageName, pageTitle, pageDesc, elements) SELECT '"+$JsonUpload.pageName+"','"+$JsonUpload.pageTitle+"','"+$JsonUpload.pageDesc+"','"+JSON.stringify($JsonUpload)+"'").then(([$PagesResults, metadata]) => {

		writeLog("Page " + $JsonUpload.pageName + " uploaded for user "+$user)
			response.end(refreshKey($user))
		}).catch(function(err) {
			writeLog(err)
			writeLog("Invalid upload page attempt - from server: " + request.connection.remoteAddress + " for path " + request.url)
			response.end("Invalid upload page attempt.")
		})//end Pages query
		} else {
			writeLog("Invalid upload attempt: bad session key for user: "+$user+" sessionID: " + $sessionID +" from server: " + request.connection.remoteAddress + " for path " + request.url)
			response.end("Invalid upload attempt: bad session key for user: " + $user + " with sessionID-to-swim: " + swimmersEncode($sessionID)) 
		}//end if user
		}).catch(function(err) {
			console.log('Pages error: ');
			console.log(err); 
	response.end(JSON.stringify(err))
		});//end Session query
    }//end if $user


    } else if ($JsonUpload.jmlVersion == "23JAN2018") {//upload site
		sessionID = $sessionID.replace(/;/g,"")
	sequelize.query("SELECT sessionuser FROM Sessions WHERE sessionid = '"+$sessionID+"';").then(([$SessionResults, metadata]) => {
			if ($user==$SessionResults[0].sessionuser) {

		sequelize.query("INSERT INTO Sites (jmlVersion, applicationName, applicationTitle, applicationVersion, siteDomain, startingPage, googleApiKey , errgoLogic, pageSettingsJson, serverSettingsJson, currentPage, onLoad, classes, style) VALUES ('"+$JsonUpload.jmlVersion+"','"+$JsonUpload.applicationName+"','"+$JsonUpload.applicationTitle+"','"+$JsonUpload.applicationVersion+"','"+$JsonUpload.siteDomain+"','"+$JsonUpload.startingPage+"','"+$JsonUpload.googleapikey +"','"+$JsonUpload.errgoLogic+"','"+$JsonUpload.pageSettingsJson+"','"+$JsonUpload.serverSettingsJson+"','"+$JsonUpload.currentPage+"','"+$JsonUpload.onLoad+"','"+JSON.stringify($JsonUpload.classes)+"','"+JSON.stringify($JsonUpload.style)+"')").then(([$PagesResults, metadata]) => {
			
		writeLog("Site " + $JsonUpload.applicationName + " uploaded for user "+$user)

	}).catch(function(err) {
		writeLog(err)
		writeLog("Invalid upload site attempt - from server: " + request.connection.remoteAddress + " for path " + request.url)
		response.end("Invalid upload site attempt.") 
		
	}).then(sequelize.query("Update Sites set pages=ARRAY"+JSON.stringify($JsonUpload.pages)+" where applicationName='"+$JsonUpload.applicationName+"'").then(([$PagesResults, metadata]) => {
		writeLog("Site " + $JsonUpload.applicationName + " result "+$PagesResults+" added to app "+$JsonUpload.applicationName)
				response.end(refreshKey($user))


	}).catch(function(err) {
		writeLog(err)
				writeLog("Invalid page update attempt - from server: " + request.connection.remoteAddress + " for path " + request.url)
				response.end("Invalid page update attempt.") 
		}))//end Sites query
		} else {
			writeLog("Invalid upload attempt: bad session key for user: "+$user+" sessionID: " + $sessionID +" from server: " + request.connection.remoteAddress + " for path " + request.url)
			response.end("Invalid upload attempt: bad session key for user: " + $user + " with sessionID-to-swim: " + swimmersEncode($sessionID)) 
		}//end if user
		}).catch(function(err) {
			console.log('Sites error: '); 
			console.log(err); 
	response.end(JSON.stringify(err))
		});//end Session query

	} else {
			writeLog("Failed upload attempt: bad upload package for user: "+$user+" sessionID: " + $sessionID +" from server: " + request.connection.remoteAddress + " for path " + request.url)
			response.end("Failed upload attempt: bad upload package for user: " + $user + " with sessionID-to-swim: " + swimmersEncode($sessionID)) 
    }//end if $JsonUpload.jmlVersion

    }//end if request.url.length



} else {
	response.end("Use GET or POST here.") 
}//end if request.method
	}catch(e){
		writeLog(e)
		writeLog("Invalid upload attempt - from server: " + request.connection.remoteAddress + " for path " + request.url)
		response.end("Invalid upload attempt.") 
	}//end try
}).listen($servicePort);
//}

//{ End items
writeLog('Service is running on port ' + $servicePort);
console.log($serviceName + ' is running on port ' + $servicePort);
//}


