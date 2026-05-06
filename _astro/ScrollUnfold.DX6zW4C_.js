import{j as n}from"./jsx-runtime.u17CrQMm.js";import{r as e}from"./index.D9mrT8mP.js";import{a as d}from"./index.C73VHuzL.js";const t=typeof window<"u"?window.matchMedia("(prefers-reduced-motion: reduce)").matches:!1;function h({children:s,delay:o=0,className:l=""}){const r=e.useRef(null),[c,u]=e.useState(t);return e.useEffect(()=>{if(t)return;const i=r.current;if(!i)return;const a=setTimeout(()=>{u(!0),d(i,{opacity:[0,1],scale:[.96,1]},{duration:.7,easing:[.22,1,.36,1]})},o);return()=>clearTimeout(a)},[o]),n.jsxs("div",{ref:r,className:`scroll-unfold${c?" scroll-unfold--visible":""} ${l}`,style:t?void 0:{opacity:0},children:[s,n.jsx("style",{children:`
        .scroll-unfold {
          clip-path: inset(40% 0 40% 0 round 4px);
          transition: clip-path 0.7s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .scroll-unfold--visible {
          clip-path: inset(0% 0 0% 0 round 0px);
        }
        @media (prefers-reduced-motion: reduce) {
          .scroll-unfold {
            clip-path: none;
            transition: none;
          }
        }
      `})]})}export{h as default};
