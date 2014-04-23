
#C:\Users\steve\Documents\GitHub\Ayvex\deploy> python .\deploy.py localhost:5984 user:pazzwordHEER index.html
#  (that is not the real user/password )




import os,sys
import json
import httplib
import urllib
import pprint
import time
from base64 import b64encode

cutoffTime=time.time()-24*60*60  #day in seconds

if len(sys.argv)<1:
	raise "must provide name:pwd"


serverPort=b""+sys.argv[1]
userPass=b""+sys.argv[2]
if (len(sys.argv)>3):
	pattern=sys.argv[3]
	pattern = b""+sys.argv[3] if len(sys.argv)>3 else b""

designDoc="/cosmos/_design/passthru"
sep="/"

def firstFoundVal(obj,listOfKeys,failOnErr):
	for k in listOfKeys:
		if (k in obj):
			return obj[k]
	print "no key found"
	pprint.pprint(obj)
	if failOnErr:
		raise "no key found"
	return ''
	
def extractRev(obj,failOnErr):
	return firstFoundVal(obj,['rev','_rev','etag'],failOnErr);			
	
def getFile(file):
	content='bad'
	with open(file, 'r') as fh:
		return fh.read()

def getMimeType(file):
	if (file.endswith(".js")):
		return "application/javascript"
	if (file.endswith(".html")):
		return "text/html"
	if (file.endswith(".htm")):
		return "text/html"
	if (file.endswith(".gif")):
		return "image/gif"
	if (file.endswith(".jpg")):
		return "image/jpeg"
	return "application/octet-stream";

	
def getRevBestEffort(doc):
	return getRev(doc,False)


def getRev(doc=designDoc,failOnErr=True):
	conn = httplib.HTTPConnection(serverPort)
	conn.request("GET",doc)
	res = conn.getresponse()
	print res.status, res.reason
	data = res.read()
	print len(data)
	#print data
	obj=json.loads(data)
	return extractRev(obj,failOnErr)


def fileIsRecent(file):
	return os.stat(file).st_mtime > cutoffTime 
	
def allRelevantFilesUnder(startDir,pattern):
	howMuchToRemoveFromStartOfPaths=len(startDir)
	retval=[]
	for root, dirs, files in os.walk(startDir, topdown=True):
		for name in files:
			if name.endswith("~"):
				continue
			filePath=os.path.join(root, name)
			if pattern=="recent":
				if fileIsRecent(filePath):
					pass
				else:
					continue
			else: #normal pattern
				if name.endswith(pattern):
					pass
				else:
					continue
			relativeUrl=filePath.replace("\\","/")[howMuchToRemoveFromStartOfPaths:]
			yield (filePath,relativeUrl,name)

			
def putAsData(filePath,dataId):   
	relativeUrl = "/cosmos/"+dataId
	rev=getRevBestEffort(relativeUrl)  #optimize this later
	revString = "?rev="+urllib.quote(rev) if rev else ''
	print "prevRevString="+revString
	editUrl=relativeUrl+revString
	print "editUrl="+editUrl
	body=getFile(filePath)
	mimeType=getMimeType(filePath)
	userAndPass = b64encode(userPass).decode("ascii")
	conn = httplib.HTTPConnection(serverPort)
	conn.request("PUT",editUrl,body,
			{
				'Content-type':mimeType
				,				'Authorization' : 'Basic %s' %  userAndPass 
				
			}
		)
	res = conn.getresponse()
	print res.status, res.reason
	data = res.read()
	print len(data)
	#print data
	obj=json.loads(data)
	return extractRev(obj,True)

			
def putAttachment(filePath,relativeUrl):
	rev=getRev()  #optimize this later
	print "prev rev="+rev
	editUrl=designDoc+'/'+relativeUrl+"?rev="+urllib.quote(rev)
	print editUrl
	body=getFile(filePath)
	mimeType=getMimeType(filePath)
	userAndPass = b64encode(userPass).decode("ascii")
	conn = httplib.HTTPConnection(serverPort)
	conn.request("PUT",editUrl,body,
			{
				'Content-type':mimeType
				,				'Authorization' : 'Basic %s' %  userAndPass 
				
			}
		)
	res = conn.getresponse()
	#print res.status, res.reason
	data = res.read()
	print len(data)
	#print data
	obj=json.loads(data)
	return extractRev(obj,True)





items=allRelevantFilesUnder(".."+sep+"web",pattern)
for file,url,name in items:	
	while url.startswith("/"):
		url=url[1:]
	result=putAttachment(file,url)
	if url.endswith(".json"):  #then also put it in as "data"
		result = result + "---" + putAsData(file,name)
	print "finished"+result
	time.sleep(1)

