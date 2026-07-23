export const beat=(tone,text)=>({tone,text});
export const choice=(text,resultText,consequenceText)=>({text,resultText,consequenceText});
export const decision=(prompt,echoText,...choices)=>({prompt,echoText,choices});
export const episodeDecision=(episode,situation,prompt,echoText,...choices)=>({episode,situation,prompt,echoText,choices});
export const track=(label,beats,decisions)=>({
  label,
  beatMix:{ordinary:10,awkward:8,friction:8,pressure:4,major:2},
  beats,
  decisions
});
