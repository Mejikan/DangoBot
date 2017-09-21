
const config = {
  token: 'Your bot token here',
  ytApiKey: 'YOUR Youtube API key here',
  ownerId: 'Your owner Id here',

  autojoin: true,
  defVol: 20,

  onBotJoinVoice: function(){
    return 'I am at your service.';
  },
  onUserNoVoice: function(){
    return 'Please join a voice channel before giving me further commands.';
  },
  onNoSameVoice: function(){
    return `I'm sorry I cannot complete your request.
      Please have me join the same voice channel.`;
  },
  onBotNoVoice: function(){
    return 'May I please join you in a voice channel?';
  },
  onBotLeaveVoice: function(){
    return 'It has been a pleasure serving you.';
  },
  onBotPlaySongStart: function(title, author){
    return `**Now playing** '${title}' **by** '${author}'.`;
  },
  onBotDLFail: function(title, author){
    return `My apologies. I failed to retrieve the video you requested. ("${title}" **by** ${author}.)`;
  },
  onAddSongQueue: function(title, author, timeTillPlay){
    return `**Added to queue** '${title}' **by** '${author}' **to play in ${timeTillPlay.hours > 0? timeTillPlay.hours + ' hour(s), ': ''}` +
      `${timeTillPlay.minutes} minute(s), ${timeTillPlay.seconds} second(s). **`;
  },
  onNoRequest: function(){
    return 'Please complete the request you have given me.';
  },
  onBadVolReq: function(){
    return 'Please give me a number from 0 to 100 so I can adjust the volume to your liking.';
  },
  onVolChange: function(oldVol, newVol){
    return `Changed volume from ${oldVol} to ${newVol}.`;
  },
  onEmptyQueue: function(){
    return 'Queue is empty.';
  },
  onNewMember: function(member){
    return `Welcome to to the server, ${member}! We hope you have an enjoyable experience with us ♫`;
  },
  onQueueClear: function(){
    return "I have cleared the queue. :put_litter_in_its_place:";
  }
}

module.exports = config;
