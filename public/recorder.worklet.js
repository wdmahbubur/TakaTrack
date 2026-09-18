/* Audio capture only. This module has no network or transcription code. */
class TakaTrackRecorder extends AudioWorkletProcessor {
  constructor(options) {
    super(); this.frames=0; this.limit=Math.floor(sampleRate*options.processorOptions.maxSeconds); this.done=false;
  }
  process(inputs) {
    if(this.done)return true;const channel=inputs[0]?.[0];if(!channel)return true;
    const length=Math.min(channel.length,this.limit-this.frames),copy=channel.slice(0,length);this.frames+=length;
    this.port.postMessage({samples:copy},[copy.buffer]);
    if(this.frames>=this.limit){this.done=true;this.port.postMessage({limit:true});}return true;
  }
}
registerProcessor('takatrack-recorder',TakaTrackRecorder);
