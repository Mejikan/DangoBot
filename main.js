const fs = require('fs');
const url = require('url');
const querystring = require('querystring');
const ytdl = require('ytdl-core');
const Discord = require('discord.js');

const request = require('request');
const config = require('./config.js');

/**
 * startDiscordClient - Creates a new bot instance/connection.
 * @function startDiscordClient
 * @author Kei, Meji
 * @namespace startDiscordClient
 */
function startDiscordClient(){
  let client = new Discord.Client();

  let appVol = config.defVol;

  let guilds = new Map();

  /**
   * Guild - Creates a new object representing a guild.
   * @class Guild
   * @memberof startDiscordClient
   * @inner
   *
   *
   */
  class Guild {

    /**
     * constructor - description
     *
     * @return {type}  description
     */
    constructor(){
      /**
       * Stores all the requests waiting to be played for this
       * guild.
       * @private
       */
      this.reqQueue = [];
    }


    /**
     * nextReq - description
     *
     * @return {type}  description
     */
    nextReq(){
      // the next song from queue into the current song
      let nextReq = this.reqQueue.shift();
      return nextReq;
    }

    getTotalQueueTime(){
      let totalQueueTime = 0;
      this.reqQueue.forEach(vidReq => {
        totalQueueTime += vidReq.vidDuration.totalTime;
      });
      return totalQueueTime;
    }

    getQueueTimeTillIndex(index){
      let totalQueueTime = 0;
      let r = 0;
      for (r in this.reqQueue){
        if (r == index) break;
        let vidReq = this.reqQueue[r];
        totalQueueTime += vidReq.vidDuration.totalTime;
      }
      return totalQueueTime;
    }
  }

  function formatTime(raw){
    const second = 1000;
    const minute = 60 * second;
    const hour = 60 * minute;
    const day = 24 * hour;
    let days = (raw - raw%day)/day;
    raw -= days * day;
    let hours = (raw - raw%hour)/hour;
    raw -= hours * hour;
    let minutes = (raw - raw%minute)/minute;
    raw -= minutes * minute;
    let seconds = (raw - raw%second)/second;
    raw -= seconds * second;
    let formatted = {
      days: days,
      hours: hours,
      minutes: minutes,
      seconds: seconds
    }
    return formatted;
  }


  /**
   * ytvideo - description
   *
   * @param  {type} vidInfo description
   * @return {type}         description
   */
  function ytvideo(vidInfo){
    return new Promise((resolve, reject) => {
      let vidURL = vidInfo.url;
      let vidTitle = vidInfo.title;
      let vidAuthor = vidInfo.author;
      if (!vidURL || vidURL.length < 1 || !vidTitle || vidTitle.length < 1 || !vidAuthor || vidAuthor.length < 1){
        reject('Unmet arguments');
        return;
      }

      vidURL = url.parse(vidURL);
      //console.log('vidURL', vidURL);
      let videoId = null;

      let hostname = vidURL.hostname.toLowerCase();
      if (hostname === 'youtube.com' || hostname === 'www.youtube.com'){
        videoId = querystring.parse(vidURL.query).v;
      } else if (hostname === 'youtu.be' || hostname === 'www.youtu.be'){
        videoId = vidURL.pathname.substring(1);
      } else {
        reject('Invalid Youtube video URL.', vidURL.href);
        return;
      }

      if (!videoId || videoId.length < 1){
        reject(`Invalid video id: ${videoId}`);
        return;
      }

      let queryParams = {
        key: config.ytApiKey,
        part: 'contentDetails',
        id: videoId
      };
      request({
        url: `https://www.googleapis.com/youtube/v3/videos`,
        method: 'GET',
        qs: queryParams
      }, (err, res, body) => {
        if (err){
          reject(`Error retrieving information for video url: ${vidURL.href} - ${JSON.stringify(err, null, 2)}`);
          return;
        } else {
          body = JSON.parse(body);
          if (body.error){
            let errMsg = `Error retrieving information for video url: ${vidURL.href}`;
            body.error.errors.forEach(val => {
              errMsg += `\n${val}`;
            });
            reject(errMsg);
            return;
          } else {
            let items = body.items;
            items.forEach(item => { // for each video result
              let duration = item.contentDetails.duration;
              let parsedDuration = { original: duration.substring(0) };
              duration = duration.substring(1);
              let dateRes = duration.substring(0, duration.indexOf('T') > -1? duration.indexOf('T'): 0);
              let letters = ['Y', 'M', 'W', 'D'];
              parsedDuration.date = {};
              letters.forEach(letter => {
                let index = dateRes.indexOf(letter);
                if (index > -1){
                  parsedDuration.date[letter] = dateRes.substring(0, index);
                  dateRes = dateRes.substring(index + 1);
                }
              });
              let timeRes = duration.substring(duration.indexOf('T') > -1? duration.indexOf('T') + 1: 0, duration.length);
              letters = ['H', 'M', 'S'];
              parsedDuration.time = {};
              letters.forEach(letter => {
                let index = timeRes.indexOf(letter);
                if (index > -1){
                  parsedDuration.time[letter] = timeRes.substring(0, index);
                  timeRes = timeRes.substring(index + 1);
                }
              });

              //console.log(parsedDuration);
              parsedDuration.totalTime = 0;
              parsedDuration.totalTime += parsedDuration.time.H? parseInt(parsedDuration.time.H) * 60 * 60 * 1000: 0;
              parsedDuration.totalTime += parsedDuration.time.M? parseInt(parsedDuration.time.M) * 60 * 1000: 0;
              parsedDuration.totalTime += parsedDuration.time.S? parseInt(parsedDuration.time.S) * 1000: 0;
              resolve({
                url: vidURL,
                title: vidTitle,
                author: vidAuthor,
                duration: parsedDuration
              });
            });
          }
        }
      });
    });
  }


  /**
   * ytsearch - description
   *
   * @param  {type} keywords description
   * @return {type}          description
   */
  function ytsearch(keywords){
    return new Promise((resolve, reject) => {
      let ytQuery = keywords;
      let queryParams = {
        key: config.ytApiKey,
        maxResults: 1,
        order: 'relevance',
        part: 'snippet',
        q: ytQuery,
        type: 'video',
        videoDuration: 'any'
      };
      request({
        url: `https://www.googleapis.com/youtube/v3/search`,
        method: 'GET',
        qs: queryParams
      }, (err, res, body) => {
        if (err){
          reject(`Error retrieving information for keyword search: ${JSON.stringify(err, null, 2)}`);
          return;
        } else {
          body = JSON.parse(body);
          if (body.error){
            let errMsg = `Error retrieving information for keyword search: ${ytQuery}`;
            body.error.errors.forEach(val => {
              errMsg += `\n${val}`;
            });
            reject(errMsg);
            return;
          } else {
            let items = body.items;
            items.forEach(item => { // for each search result
              ytvideo({
                url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
                title: item.snippet.title,
                author: item.snippet.channelTitle
              }).then( res => {
                resolve(res);
                return;
              }).catch( err => {
                reject(err);
                return;
              });
            });
          }
        }
      });
    });
  }

  function yturl(){

  }

  // when bot logs in
  client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);

    // autojoin
    // retrieve all possible guilds
    if (config.autojoin){
      client.guilds.forEach(guild => {
        guild.fetchMember(config.ownerId).then( owner => {
          if (owner && owner.voiceChannel){
            owner.voiceChannel.join();
            console.log('Joined voice channel of owner.');
          }
        }).catch( err => {
          if (err.message != 'Unknown Member'){
            console.error(err);
          }
        });
      });
    }
  });

  client.on('disconnect', evt => {
    console.log('Disconnected.', evt);
  });

  // when bot hears a message
  client.on('message', msg => {
    /*
    if (msg.content === 'Ping') {
      msg.reply('Pong!');
    }
    */

    try {
      if (msg.content.indexOf('/') == 0 && msg.author.id != client.user.id){ // a user has issued a command
        console.log(`['${msg.author.username}' ('${msg.author.id}')] issued command: '${msg.content}'`);

        let cmdArgs = msg.content.split(' ');

        if (msg.guild){ // commands that must be issued as part of a guild
          if (cmdArgs[0] === '/join'){ // joins voice
            // attempt to join voice

            // Only try to join the sender's voice channel if they are in one themselves
            if (msg.member.voiceChannel) {
              msg.member.voiceChannel.join()
                .then(connection => { // Connection is an instance of VoiceConnection
                  msg.reply(config.onBotJoinVoice());
                  console.log(`Joined voice channel - ${msg.member.voiceChannel.name}.`)
                })
                .catch(console.error);
            } else {
              msg.reply(config.onUserNoVoice());
            }
          } else if (cmdArgs[0] === '/restart'){
            client.destroy();
            startDiscordClient();

          } else { // must be in same voice channel as bot
            let memberVoiceChan = msg.member.voiceChannel;
            let voiceConn = client.voiceConnections.first();
            let voiceChan = null;
            if (voiceConn){
              voiceChan = voiceConn.channel;
              if (memberVoiceChan && voiceChan && memberVoiceChan.name === voiceChan.name && memberVoiceChan.guild === voiceChan.guild){
              } else {
                /* If you are not in the same voice as the bot then issue warning and ignore command */
                msg.reply(config.onNoSameVoice());
                return;
              }
            } else {
              msg.reply(config.onBotNoVoice());
              return;
            }

            if (cmdArgs[0] === '/bye'){ // leaves voice
              voiceChan.leave();
              msg.reply(config.onBotLeaveVoice());
              client.destroy();
            } else if (cmdArgs[0] === '/play'){

              function playYTURL(vidURL, vidTitle, vidAuthor, vidDuration){

                function playURL(msg, vidTitle, vidAuthor, vidURL){
                  let voiceConn = client.voiceConnections.first();
                  if (!voiceConn){ // in the case that the bot is no longer connected to voice
                    console.error(`No longer connected to voice, can not play ${vidURL}`);
                    return;
                  }
                  function playNext(){
                    let curGuild = guilds.get(voiceConn.channel.guild.id);
                    if (curGuild){
                      let req = curGuild.nextReq();
                      if (req){
                        curGuild.curReq = req;
                        playURL(req.msg, req.vidTitle, req.vidAuthor, req.vidURL);
                      }
                    }
                  }

                  console.log(`Downloading: ${vidURL}`);
                  let stream = ytdl(vidURL, {filter : 'audioonly'});
                  stream.on('info', (info, format) => {
                    let title = (vidTitle)? vidTitle: info.title;
                    let author = (vidAuthor)? vidAuthor: info.author.name;
                    //console.log(`Attempting to play - '${title}' by '${author}'`);

                    let dispatcher = voiceConn.playStream(stream);
                    dispatcher.setVolume(appVol/100);

                    dispatcher.on('start', () => {
                      msg.channel.send(config.onBotPlaySongStart(title, author));
                      client.user.setGame(title);
                      console.log(`**Now playing** '${title}' by '${author}'.`);
                    });

                    dispatcher.on('end', () => {
                      console.log(`Finished playing ${title}.`);
                      client.user.setGame(null);
                      playNext();
                    });

                    dispatcher.on('error', e => {
                      // Catch any errors that may arise
                      console.error(e);
                    });

                    dispatcher.on('debug', info => {
                      console.log('DEBUG: ', info);
                    });
                  });

                  stream.on('error', error => {
                    msg.channel.send(config.onBotDLFail(vidTitle, vidAuthor));
                    console.error('Failed to retrieve video data.', `${vidTitle}[${vidURL}]`, error);

                    playNext();
                  });
                }

                let guild = guilds.get(msg.guild.id);
                if (!guild){
                  guild = new Guild();
                  guilds.set(msg.guild.id, guild);
                }
                if (voiceConn.speaking){
                  let totalQueueTime = guild.getTotalQueueTime() + (guild.curReq.vidDuration.totalTime - voiceConn.dispatcher.time);
                  let timeTillPlay = formatTime(totalQueueTime);
                  guild.reqQueue.push({
                    msg: msg,
                    vidTitle: vidTitle,
                    vidAuthor: vidAuthor,
                    vidURL: vidURL,
                    vidDuration: vidDuration
                  });
                  msg.channel.send(config.onAddSongQueue(vidTitle, vidAuthor, timeTillPlay));
                  return;
                } else {
                  guild.curReq = {
                    msg: msg,
                    vidTitle: vidTitle,
                    vidAuthor: vidAuthor,
                    vidURL: vidURL,
                    vidDuration: vidDuration
                  };
                  playURL(msg, vidTitle, vidAuthor, vidURL);
                }
              }

              if (!cmdArgs[1] || cmdArgs[1].trim().length < 1){
                msg.reply(config.onNoRequest());
                return;
              }

              if (cmdArgs[1].indexOf('https://') == 0 || cmdArgs[1].indexOf('http://') == 0){ // user has given a url
                request('https://noembed.com/embed?url=' + cmdArgs[1], (err, res, body) => {
                  //console.log(`${cmdArgs[1]} statusCode:`, res && res.statusCode); // Print the response status code if a response was received
                  if (err){
                    console.error(`Error retrieving information from url: ${cmdArgs[1]}`, err);
                  } else {
                    body = JSON.parse(body);
                    ytvideo({
                      url: cmdArgs[1],
                      title: body.title,
                      author: body.author_name
                    }).then( res => {
                      playYTURL(res.url.href, res.title, res.author, res.duration);
                    }).catch( err => {
                      console.error(`Error retrieving video information.`, err);
                    });
                  }
                });
              } else { // the user has given keywords to be searched
                let ytQuery = '';
                cmdArgs.slice(1).forEach((val) => {
                  ytQuery += val + ' ';
                });
                ytsearch(ytQuery).then( res => {
                  playYTURL(res.url.href, res.title, res.author, res.duration);
                }).catch( err => {
                  console.error(`Error retrieving video information.`, err);
                });
              }

            } else if (cmdArgs[0] === '/skip'){
              if (voiceConn && voiceConn.speaking){ // currently speaking
                let dispatcher = voiceConn.dispatcher;
                if (dispatcher) dispatcher.end();
              }
            } else if (cmdArgs[0] === '/pause'){
              if (voiceConn && voiceConn.speaking){ // currently speaking
                let dispatcher = voiceConn.dispatcher;
                if (dispatcher) dispatcher.pause();
              }
            } else if (cmdArgs[0] === '/resume'){
              if (voiceConn){
                let dispatcher = voiceConn.dispatcher;
                if (dispatcher && dispatcher.paused){ // currently paused
                  dispatcher.resume();
                }
              }
            } else if (cmdArgs[0] === '/vol'){
              let userVol = cmdArgs[1];
              if (!userVol || isNaN(userVol)){
                msg.reply(config.onBadVolReq());
                return;
              }
              userVol = parseInt(userVol);
              if (!Number.isInteger(userVol) || userVol > 100 || userVol < 0){
                msg.reply(config.onBadVolReq());
                return;
              }

              let oldVol = appVol;
              let newVol = userVol;
              // change the 'defVol' attribute of the application
              appVol = newVol;

              // if the bot is currently speaking, then change the bot's current speaking volume
              if (voiceConn){
                let dispatcher = voiceConn.dispatcher;
                if (dispatcher){
                  dispatcher.setVolume(newVol/100);
                }
              }

              // notify the user of volume change
              msg.reply(config.onVolChange(oldVol, newVol));
            } else if (cmdArgs[0] === '/queue'){
              let curGuild = guilds.get(voiceChan.guild.id);

              if (!curGuild){ // if no guild object created for this guild yet
                curGuild = new Guild();
                guilds.set(voiceChan.guild.id, curGuild);
              }

              let res = '';
              curGuild.reqQueue.forEach((val, i, arr) => {
                res += '\n' + (i + 1) + '. ';
                if (val.vidTitle){
                  res += val.vidTitle.substring(0, val.vidTitle.length > 40? 40: val.vidTitle.length);
                } else {
                  res += val.vidURL.substring(0, val.vidURL.length > 40? 40: val.vidURL.length);
                }

                if (val.vidAuthor){
                  res += ' by ' + val.vidAuthor.substring(0, val.vidAuthor.length > 40? 40: val.vidAuthor.length);
                }

                let timeTillPlay = formatTime(curGuild.getQueueTimeTillIndex(i) + (curGuild.curReq.vidDuration.totalTime - voiceConn.dispatcher.time) ); // duration - time played
                res += ` in ${timeTillPlay.hours > 0? timeTillPlay.hours + ' hour(s), ': ''}` +
                  `${timeTillPlay.minutes} minute(s), ${timeTillPlay.seconds} second(s).`;
              });

              if (res.trim().length < 1){ // empty queue
                msg.reply(config.onEmptyQueue());
              } else {
                msg.reply(res);
              }

            } else if (cmdArgs[0] === '/clear'){
              let curGuild = guilds.get(voiceChan.guild.id);

              if (!curGuild){ // if no guild object created for this guild yet
                curGuild = new Guild();
                guilds.set(voiceChan.guild.id, curGuild);
              }
              curGuild.reqQueue = [];
              msg.reply(config.onQueueClear());
            }
          }
        }
      } else { // normal message
        console.log('msg***', msg);

      }
    } catch(err){
      console.error(err);

      client.destroy();
      startDiscordClient();
    }
  });

  // when bot notices that a person has joined the server
  client.on('guildMemberAdd', member => {
    // Send the message to the guilds default channel (usually #general), mentioning the member
    member.guild.defaultChannel.send(config.onNewMember(member));

    // If you want to send the message to a designated channel on a server instead
    // you can do the following:
    const channel = member.guild.channels.find('name', 'member-log');
    // Do nothing if the channel wasn't found on this server
    if (!channel) return;
    // Send the message, mentioning the member
    channel.send(config.onNewMember(member));
  });


  client.login(config.token);
}

startDiscordClient();
