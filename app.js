'use strict';
const menuButton=document.querySelector('.menu-button');const nav=document.querySelector('.nav');
if(menuButton&&nav){menuButton.addEventListener('click',()=>{const open=nav.classList.toggle('open');menuButton.setAttribute('aria-expanded',String(open));});nav.addEventListener('keydown',e=>{if(e.key==='Escape'){nav.classList.remove('open');menuButton.setAttribute('aria-expanded','false');menuButton.focus();}});}
for(const a of document.querySelectorAll('.nav .active'))a.setAttribute('aria-current','page');
const main=document.querySelector('main');if(main){main.id='contenido';const skip=document.createElement('a');skip.className='skip-link';skip.href='#contenido';skip.textContent='Saltar al contenido';document.body.prepend(skip);}
