import React from 'react';
export function Link({href,children,...props}) { return React.createElement('a',{href,...props},children); }
export default function Image({src,alt,className,style}) { return React.createElement('img',{src,alt,className,style}); }
