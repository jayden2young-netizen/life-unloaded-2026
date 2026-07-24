export const beat=(tone,text,extra={})=>({tone,text,...extra});
export const choice=(text,resultText,consequenceText,extra={})=>({text,resultText,consequenceText,...extra});
export const decision=(prompt,echoText,...choices)=>({prompt,echoText,choices});
export const episodeDecision=(episode,situation,prompt,echoText,...choices)=>{
  const {age,...episodeSpec}=episode;
  return{episode:episodeSpec,...(age?{age}:{}),situation,prompt,echoText,choices};
};
export const track=(label,beats,decisions)=>({
  label,
  beatMix:{ordinary:10,awkward:8,friction:8,pressure:4,major:2},
  beats,
  decisions
});
