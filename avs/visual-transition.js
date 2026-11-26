// Fade a captured frame on a separate layer; it never contaminates feedback canvases.
(() => {
  let overlay,timer;
  window.visualTransition={
    capture(canvas){
      if(!canvas||!canvas.width||!canvas.height)return;
      try{
        const image=new Image();image.alt='';image.setAttribute('aria-hidden','true');
        image.className='visual-transition';image.src=canvas.toDataURL('image/png');
        overlay?.remove();clearTimeout(timer);overlay=image;
        document.getElementById('stage').append(image);
        requestAnimationFrame(()=>requestAnimationFrame(()=>{
          if(overlay!==image)return;
          image.style.opacity='0';
          timer=setTimeout(()=>{image.remove();if(overlay===image)overlay=null;},1500);
        }));
      }catch(error){console.warn('Transição indisponível',error.message);}
    }
  };
})();
