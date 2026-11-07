// A phone number as people expect to read it: one leading "+", whatever way it was typed or stored
// (channels added by hand keep the "+" they were typed with, those connected through the popup do not).
export const plusPhone = (p) => (p ? '+' + String(p).replace(/^\++/, '') : '')
