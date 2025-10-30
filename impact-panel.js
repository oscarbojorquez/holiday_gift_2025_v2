(function(){
  const { gsap } = window;
  if(!gsap||!window.ScrollTrigger){console.error("GSAP / ScrollTrigger required.");return;}
  gsap.registerPlugin(window.ScrollTrigger);
  const HAS_DRAWSVG=!!window.DrawSVGPlugin;
  if(HAS_DRAWSVG) gsap.registerPlugin(window.DrawSVGPlugin);

  function prepPath(el){
    if(!el)return;
    const len=el.getTotalLength?el.getTotalLength():1000;
    if(HAS_DRAWSVG){gsap.set(el,{drawSVG:"0% 0%"});}
    else{el.style.strokeDashoffset=len;el.dataset.len=len;}
  }
  function drawPath(tl,el,start,dur=1){
    if(HAS_DRAWSVG){tl.to(el,{drawSVG:"0% 100%",ease:"none",duration:dur},start);}
    else{const len=el.dataset.len||el.getTotalLength();tl.set(el,{strokeDashoffset:len},start);tl.to(el,{strokeDashoffset:0,ease:"none",duration:dur},start);}
  }

  function mount(section){
    const duration=parseInt(section.dataset.duration||"2600",10);
    const svg=section.querySelector(".naming-animation");
    const texts={
      headline:svg.querySelector(".headline"),
      introducing:svg.querySelector(".introducing"),
      our:svg.querySelector(".our"),
      new:svg.querySelector(".new"),
      name:svg.querySelector(".name"),
      logoLabel:svg.querySelector(".logo-label")
    };
    const paths=svg.querySelectorAll(".path");
    paths.forEach(prepPath);

    const tl=gsap.timeline({
      defaults:{duration:1,ease:"power1.out"},
      scrollTrigger:{trigger:section,start:"top top",end:`+=${duration}`,scrub:true,pin:true}
    });

    // sequence
    tl.fromTo(texts.introducing,{opacity:0,y:20},{opacity:1,y:0},0.0);
    drawPath(tl,paths[0],0.2);
    tl.fromTo(texts.our,{opacity:0,y:20},{opacity:1,y:0},0.6);
    drawPath(tl,paths[1],0.8);
    tl.fromTo(texts.new,{opacity:0,y:20},{opacity:1,y:0},1.2);
    drawPath(tl,paths[2],1.4);
    tl.fromTo(texts.name,{opacity:0,y:20},{opacity:1,y:0},1.8);
    drawPath(tl,paths[3],2.0);
    tl.fromTo(".logo-wrap",{opacity:0,y:20},{opacity:1,y:0},2.3);

    section._impactTL=tl;
  }

  document.addEventListener("DOMContentLoaded",()=>{
    document.querySelectorAll("[data-impact-panel]").forEach(mount);
  });
})();
