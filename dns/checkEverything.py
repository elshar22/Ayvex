#!/usr/bin/python

"""

 check everything about an internet connection for impact hub

  author:smcclure879


"""

import os,sys,httplib,time
import subprocess
import ipgetter
import urllib2
import json,uuid



#early settings
echoLog = True
speaking = False




def dictToJson(dddict):
    retval = json.dumps( dddict, default=lambda o: o.__dict__ , sort_keys=True, indent=4)
    return retval





class Site:
    def __init__(self,nick,host,port,expectCode):
        self.nick = nick
        self.host = host
        self.port = port
        self.expectCode = expectCode
        self.strict = True
        self.timeout = 10


    def verify(self,interface):
        print self.nick
        try:
            addressTuple = interface.getAddressTuple()
            # print addressTuple
            conn = httplib.HTTPConnection(self.host, self.port, self.strict, self.timeout, addressTuple)
        except HTTPException as ex:
            log("exception "+ex)
            return False
            
        res = ''
        try:
            conn.request("HEAD", "/")
            res = conn.getresponse()
        except:
            log("failed response:"+self.nick)
            return False


        try:
            conn.close()
        except:
            pass

        if res.status==self.expectCode:
            return True

        print res.status, res.reason
        return False
    def diagnose(self,interface):
        return "bugbug nyi tracert"


def post_bugbug_old(interfaceName,url,data):  #bugbug can't specify interface with this code
    jsondata = dictToJson(data)
    log("x"+url+"x")
    log(jsondata) #bugbug

    postreq = urllib2.Request(url, jsondata)
    postreq.add_header('Content-Type', 'application/json')
    postreq.get_method = lambda: 'POST'
    resp = urllib2.urlopen(postreq)
    responseText = resp.read()
    print "resp:"+responseText



def post(interfaceName,url,data):  #bugbug can't specify interface with this code
    print "new post, url="+url
    jsondata = dictToJson(data)
    print jsondata
    clen = len(jsondata)
    req = urllib2.Request(url, jsondata, {'Content-Type': 'application/json', 'Content-Length': clen})
    req.get_method = lambda: "POST"
    f = urllib2.urlopen(req)
    response = f.read()
    f.close()



def newguid():
    return str(uuid.uuid1())


def tellMeshTemp(interfaceName,meshite,allAboutMe):
    post(interfaceName,meshite+"/ENTRY/"+newguid()+"/",allAboutMe)


def portGiver():
    hashval = int(time.time()) % 19479 
    nextPort = int(8899)+hashval
    while True:
        yield nextPort
        nextPort += 1
openPorts = portGiver()

class NetInterface:
    def __init__(self,nick,name,ipAddr):
        self.nick = nick
        self.name = name
        self.ipAddr = ipAddr
    def getAddressTuple(self):
        return (self.ipAddr,openPorts.next())
        
    

def makeInterface(name,section):
    nick=getNick(name)
    ipAddr=seek(section,"inet addr")
    return NetInterface(nick,name,ipAddr)



def getNick(name):
    if name=="eth0":
        return "wired"
    elif name=="wlan0":
        return "wireless"
    else:
        return "unknown"





def run(prog,arg1):
    return runall([prog,arg1])

def runall(argsArray):
    #return subprocess.check_output(argsArray)
    #bugbug you are here
    sp = subprocess.Popen(argsArray, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    out, err = sp.communicate()
    
    if err:
        raise err

    if sp.returncode <> 0:
        raise "wierd code="+sp.returncode

    return out



FNULL = open(os.devnull, 'w')
def runhide(prog,arg1):
    cmd = subprocess.Popen([prog,arg1],stderr=FNULL) #bugbug how to hide input??
    stdoutdata, stderrdata = cmd.communicate()
    return stdoutdata

fh1=None
def log(x):
    x += "\n"
    fh1.write(x)
    if echoLog:
        print x


def closeAll():
    try:
        fh1.close()
    except:
        pass

    try:
        FNULL.close() #bugbug needed??
    except:
        pass


def quip(x):
    log(x)
    if speaking:
        runhide("espeak",x) 
def announceIp(x):
    if os.path.isfile("no-ip-announce.txt"):
        return
    runhide("espeak", "at "+x)  

def seek(corpus,soughtName):  #look for soughtName:  value  and return value
    chunks = corpus.split("  ")
    sought = soughtName + ":"
    theLen = len(sought)
    for chunk in chunks:
        if chunk[0:theLen]==sought:
            return chunk[len(sought):]
    return ''


    


MINUTES = 60


#settings are here

testSites = [
    Site("google","www.google.com",80,200),
    Site("comcast","www.comcast.com",80,301),  #they keep moving their site too!
    Site("ayvex","ayvex.dnsalias.com",8081,200),
    Site("bogus1","notAyvex.dnsalias.com",80,200),
    Site("bogus2","yapulousity.envalponer.com",80,200),
#    Site("locaz1","192.168.1.1",80,200),   #bugbug why so slow?
#    Site("locaz2","10.1.1.1",80,200)      #bugbug why so slow?

]


meshites = [
    "http://ayvex.dnsalias.com:8081"
]


interfaces = dict()

#chdir into own dir
os.chdir(os.path.dirname(sys.argv[0]))    #this is failing bugbug



# #figure the time for log file etc.
theTime = time.gmtime()
humanTime = time.strftime("%c")
timeForLogFile = time.strftime("%y%m%d%H",theTime)

#bugbug need to exit if df returns high% utilization


# open the log
logFile = "./logs/netlog_"+timeForLogFile+".txt"
fh1=open(logFile,"ab+")


log("----starting log----time="+humanTime)


# #if less than 1 minute since startup then hold off (exit)
delay = 1 * MINUTES
uptimeText = run("cat","/proc/uptime")
log("uptime="+uptimeText)
uptime = int(float(uptimeText.split(" ")[0]))
print uptime/3600,"hrs up"
if uptime<delay:
    log("waiting because we just started up")
    time.sleep(delay)
else:
    log("proceeding")




# #if there's another of me then die
# run ps grep for checkEverything
try:
    procs = run("ps", "-A").split()
except ex as Exception:
    log(str(ex))

procsLikeMe =filter( lambda x: "checkEverything" in x,  procs )
if len(procsLikeMe)>1:
    quip("duplicate check running")
    exit(1)
else:
    log ("no dup procs")


log("about to run ifconfig")
try:
    sections = runall(["ifconfig"]).split("\n\n")
except ex as Exception:
    log("ifconf prob"+ex)
interfacesUp = 0
for section in sections:  #each is an interface
    #log(section)
    lines=section.split("\n")
    name = lines[0].split("  ")[0]
    log( "interface="+name )
    if not name:
        continue
    if name=='lo':
        continue

    ipAddr=seek(section,"inet addr")

    if not ipAddr:
        quip("bad interface: "+getNick(name))
    else:
        announceIp(ipAddr)
        interface = makeInterface(name,section)

        sitesOk = 0
        for site in testSites:
            if site.verify(interface):
                sitesOk += 1
            else:
                quip(site.nick + " is down")
                site.diagnose(interface);


        if sitesOk>0: #some are at least
            log("interface ok:" + interface.nick)
            interface.isGood=True
            interfacesUp += 1
        else:
            quip(interface.nick + "is down")
            interface.isGood=False
            #start pinging the router etc            

        interfaces[interface.name]=interface

if interfacesUp<1:
    quip("comcast is down")
else:
    useInterface = interfaces['eth0']  #bugbug or find the first isGood one???
    allAboutMe = dict( interfaces=interfaces, externalIP=ipgetter.myip() )
    for meshite in meshites:
        tellMeshTemp(useInterface,meshite,allAboutMe)

        
quip("c")
closeAll()

