<script lang="ts">
  import { fade, draw } from 'svelte/transition'
  import { onMount } from 'svelte'
  import { quintInOut, quintOut } from 'svelte/easing'

  export let max = 2
  export let min = 0.5
  export let disableAnimation = false

  function getRandom() {
    return Math.floor(Math.random() * (max - min + 1) + min) * 1000
  }

  const fadeDuration = (max - min) * 1000
</script>

<div class="flex items-center justify-center w-full h-full">
  <svg width="100%" viewBox="0 0 442 442" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      in:draw|global={{ duration: disableAnimation ? 0 : getRandom(), easing: quintOut }}
      d="M243.412 231.543L268.608 188.768L243.412 231.543Z"
      stroke="currentColor"
      stroke-width="4"
      stroke-miterlimit="10"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      in:draw|global={{ duration: disableAnimation ? 0 : getRandom(), easing: quintOut }}
      d="M200.931 231.543L175.735 188.768L200.931 231.543Z"
      stroke="currentColor"
      stroke-width="4"
      stroke-miterlimit="10"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      in:draw|global={{ duration: disableAnimation ? 0 : getRandom(), easing: quintOut }}
      d="M153.176 185.755L102.784 126.411C98.3893 133.039 94.2877 139.666 91.0649 146.896C89.307 150.812 90.1859 155.631 93.4087 158.343L181.888 231.845H191.849L153.176 185.755Z"
      stroke="currentColor"
      stroke-width="4"
      stroke-miterlimit="10"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      in:draw|global={{ duration: disableAnimation ? 0 : getRandom(), easing: quintOut }}
      d="M200.931 231.543L175.735 188.767L116.261 87.5513C109.229 94.1785 103.077 101.408 97.5105 108.939C94.8737 112.554 95.1667 117.374 98.0965 120.687L153.469 185.755L192.435 231.543H200.931Z"
      stroke="currentColor"
      stroke-width="4"
      stroke-miterlimit="10"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      in:draw|global={{ duration: disableAnimation ? 0 : getRandom(), easing: quintOut }}
      d="M192.142 231.543L153.176 185.755L192.142 231.543Z"
      stroke="currentColor"
      stroke-width="4"
      stroke-miterlimit="10"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      in:draw|global={{ duration: disableAnimation ? 0 : getRandom(), easing: quintOut }}
      d="M175.736 188.768L200.932 231.544H208.842L140.285 48.9934C130.617 55.0182 121.828 61.9467 114.211 69.4776C111.281 72.49 110.695 77.3098 112.746 80.9247L116.554 87.5519L175.736 188.768Z"
      stroke="currentColor"
      stroke-width="4"
      stroke-miterlimit="10"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      in:draw|global={{ duration: disableAnimation ? 0 : getRandom(), easing: quintOut }}
      d="M116.261 87.5513L175.735 188.767L116.261 87.5513Z"
      stroke="currentColor"
      stroke-width="4"
      stroke-miterlimit="10"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      in:draw|global={{ duration: disableAnimation ? 0 : getRandom(), easing: quintOut }}
      d="M215.58 231.544L188.334 55.6207L182.767 18.8696C179.251 20.0746 175.443 21.2796 171.927 22.7858C161.673 26.7019 152.298 32.1242 143.508 37.8477C139.993 40.2576 138.528 44.7761 139.992 48.9934L208.549 231.544H215.58V231.544Z"
      stroke="currentColor"
      stroke-width="4"
      stroke-miterlimit="10"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      in:draw|global={{ duration: disableAnimation ? 0 : getRandom(), easing: quintOut }}
      d="M262.163 231.543L350.642 158.041C353.864 155.33 355.036 150.51 352.986 146.594C349.763 139.666 345.661 132.737 341.266 126.11L290.874 185.454L252.202 231.543H262.163Z"
      stroke="currentColor"
      stroke-width="4"
      stroke-miterlimit="10"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      in:draw|global={{ duration: disableAnimation ? 0 : getRandom(), easing: quintOut }}
      d="M243.412 231.543H252.202L291.168 185.755L346.54 120.687C349.47 117.374 349.47 112.554 347.126 108.939C341.56 101.408 335.407 94.1785 328.376 87.5513L268.901 188.767L243.412 231.543Z"
      stroke="currentColor"
      stroke-width="4"
      stroke-miterlimit="10"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      in:draw|global={{ duration: disableAnimation ? 0 : getRandom(), easing: quintOut }}
      d="M252.202 231.543L290.874 185.755L252.202 231.543Z"
      stroke="currentColor"
      stroke-width="4"
      stroke-miterlimit="10"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      in:draw|global={{ duration: disableAnimation ? 0 : getRandom(), easing: quintOut }}
      d="M243.413 231.544L268.609 188.768L328.083 87.5519L331.892 80.9247C333.943 77.3098 333.357 72.49 330.427 69.4776C322.516 61.9467 314.02 55.0182 304.352 48.9934L235.795 231.544H243.413Z"
      stroke="currentColor"
      stroke-width="4"
      stroke-miterlimit="10"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      in:draw|global={{ duration: disableAnimation ? 0 : getRandom(), easing: quintOut }}
      d="M268.609 188.767L328.083 87.5513L268.609 188.767Z"
      stroke="currentColor"
      stroke-width="4"
      stroke-miterlimit="10"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      in:draw|global={{ duration: disableAnimation ? 0 : getRandom(), easing: quintOut }}
      d="M304.351 48.9934C305.816 45.0773 304.351 40.2576 300.836 37.8477C292.046 31.8229 282.671 26.7019 272.417 22.7858C268.901 21.2796 265.093 20.0746 261.577 18.8696L256.01 55.6207L228.763 231.544H235.795L304.351 48.9934Z"
      stroke="currentColor"
      stroke-width="4"
      stroke-miterlimit="10"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      in:draw|global={{ duration: disableAnimation ? 0 : getRandom(), easing: quintOut }}
      d="M261.577 17.9656C262.163 13.447 259.526 8.92845 255.132 7.7235C253.374 7.12103 252.788 6.21731 235.795 3.20493C232.865 2.60246 229.057 2 224.076 2C222.904 2 221.146 2 219.388 2C214.408 2.30124 210.599 2.9037 207.669 3.20493C190.97 6.21731 190.384 7.12103 188.333 7.7235C183.938 8.92845 181.301 13.447 181.887 17.9656C193.606 93.8775 203.568 158.041 214.994 231.543H227.885C239.897 158.041 249.858 94.1788 261.577 17.9656Z"
      stroke="currentColor"
      stroke-width="4"
      stroke-miterlimit="10"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      in:draw|global={{ duration: disableAnimation ? 0 : getRandom(), easing: quintOut }}
      d="M2 231.543H440"
      stroke="currentColor"
      stroke-width="4"
      stroke-miterlimit="10"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      in:draw|global={{ duration: disableAnimation ? 0 : getRandom(), easing: quintOut }}
      d="M440 360.172H2"
      stroke="currentColor"
      stroke-width="4"
      stroke-miterlimit="10"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      in:draw|global={{ duration: disableAnimation ? 0 : getRandom(), easing: quintOut }}
      d="M393.124 386.681H49.1697"
      stroke="currentColor"
      stroke-width="4"
      stroke-miterlimit="10"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      in:draw|global={{ duration: disableAnimation ? 0 : getRandom(), easing: quintOut }}
      d="M345.955 413.49H96.0458"
      stroke="currentColor"
      stroke-width="4"
      stroke-miterlimit="10"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      in:draw|global={{ duration: disableAnimation ? 0 : getRandom(), easing: quintOut }}
      d="M299.079 440H143.215"
      stroke="currentColor"
      stroke-width="4"
      stroke-miterlimit="10"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      in:fade|global={{
        duration: disableAnimation ? 0 : fadeDuration,
        easing: quintInOut
      }}
      d="M76.2089 265.282V264.05L75.3505 264.933C71.7883 268.596 68.8304 273.162 66.47 278.016L66.4651 278.026L66.4607 278.037C64.0899 283.521 62.9041 289.312 62.9041 295.104C62.9041 307.576 67.0503 318.247 75.3505 326.782L76.2089 327.664V326.433V265.282Z"
      fill="currentColor"
      stroke="currentColor"
    />
    <path
      in:fade|global={{
        duration: disableAnimation ? 0 : fadeDuration,
        easing: quintInOut
      }}
      d="M135.198 261.62L135.182 261.603L135.165 261.588C133.383 260.062 129.832 257.324 124.803 254.891L124.792 254.885L124.78 254.88C119.739 252.746 114.107 251.527 108.178 251.527C97.8024 251.527 88.9004 254.885 80.9035 261.585L80.7246 261.735V261.968V329.747V329.98L80.9035 330.13C88.9018 336.831 98.0972 340.188 108.178 340.188C114.107 340.188 119.739 338.969 124.78 336.834L124.78 336.835L124.793 336.829C129.917 334.487 133.671 331.584 134.997 330.558C135.05 330.517 135.099 330.479 135.145 330.444L135.173 330.422L135.198 330.397C135.504 330.081 135.804 329.81 136.091 329.551C136.205 329.448 136.316 329.348 136.424 329.248C136.784 328.915 137.147 328.555 137.34 328.158L137.493 327.842L137.249 327.591L129.338 319.457L128.98 319.089L128.621 319.457L126.571 321.566L126.232 321.915L126.571 322.263L131.754 327.593C124.906 333.022 116.956 335.874 107.886 335.874C98.9935 335.874 91.2543 333.247 84.3615 327.701V263.721C91.2653 258.453 99.0081 255.54 107.886 255.54C117.245 255.54 125.196 258.393 131.762 263.813L126.571 269.151L126.232 269.499L126.571 269.848L128.621 271.956L128.98 272.325L129.338 271.956L137.249 263.823L138.074 262.974H136.89C136.771 262.974 136.591 262.913 136.287 262.67C135.987 262.43 135.645 262.08 135.198 261.62Z"
      fill="currentColor"
      stroke="currentColor"
    />
    <path
      in:fade|global={{
        duration: disableAnimation ? 0 : fadeDuration,
        easing: quintInOut
      }}
      d="M156.192 253.835V253.335H155.692H144.266H143.812L143.768 253.787L143.475 256.799L143.473 256.823V256.848V338.182V338.682H143.973H155.692H156.192V338.182V253.835Z"
      fill="currentColor"
      stroke="currentColor"
    />
    <path
      in:fade|global={{
        duration: disableAnimation ? 0 : fadeDuration,
        easing: quintInOut
      }}
      d="M189.626 334.368H164.344V253.835V253.335H163.844H160.914H160.414V253.835V338.182V338.682H160.914H189.626H190.126V338.182V334.868V334.368H189.626Z"
      fill="currentColor"
      stroke="currentColor"
    />
    <path
      in:fade|global={{
        duration: disableAnimation ? 0 : fadeDuration,
        easing: quintInOut
      }}
      d="M255.042 338.033L252.608 330.247H257.202H257.702V329.747V326.735H257.495V326.235H257.202H256.702H251.411L235.117 276.874L234.639 275.426L234.167 276.876L214.245 338.027L214.031 338.682H214.72H217.943H218.31L218.42 338.331L220.947 330.247H248.338L250.865 338.331L250.975 338.682H251.342H254.565H255.245L255.042 338.033ZM247.139 326.235H222.444L234.93 288.576L247.139 326.235Z"
      fill="currentColor"
      stroke="currentColor"
    />
    <path
      in:fade|global={{
        duration: disableAnimation ? 0 : fadeDuration,
        easing: quintInOut
      }}
      d="M230.36 272.064L230.411 271.908L230.36 271.752L224.5 253.979L224.029 252.55L223.551 253.977L195.426 338.023L195.205 338.681H195.9H208.205H208.567L208.68 338.337L230.36 272.064Z"
      fill="currentColor"
      stroke="currentColor"
    />
    <path
      in:fade|global={{
        duration: disableAnimation ? 0 : fadeDuration,
        easing: quintInOut
      }}
      d="M276.554 253.835V253.335H276.054H264.335H263.835V253.835V256.848V338.182V338.682H264.335H276.054H276.554V338.182V253.835Z"
      fill="currentColor"
      stroke="currentColor"
    />
    <path
      in:fade|global={{
        duration: disableAnimation ? 0 : fadeDuration,
        easing: quintInOut
      }}
      d="M335.583 337.881V271.623C335.88 266.36 334.064 261.999 330.145 258.586C326.536 255.188 322.021 253.335 316.625 253.335H315.746H315.246V253.835V338.182V338.682H315.746H318.676H319.176V338.182V257.4C322.56 257.808 325.226 259.485 327.674 261.996C329.961 264.943 331.36 268.145 331.36 271.608V337.881V338.381H331.86H335.083H335.583V337.881Z"
      fill="currentColor"
      stroke="currentColor"
    />
    <path
      in:fade|global={{
        duration: disableAnimation ? 0 : fadeDuration,
        easing: quintInOut
      }}
      d="M309.817 338.682H310.317V338.182V253.835V253.335H309.817H298.098H297.598V253.835V260.15C294.048 255.687 289.174 253.335 282.57 253.335H281.691H281.191V253.835V338.182V338.682H281.691H284.914H285.414V338.182V257.402C288.593 257.796 291.474 259.24 293.602 261.974L293.619 261.996L293.638 262.016C296.175 264.624 297.305 267.809 297.305 271.307V338.182V338.682H297.805H309.817Z"
      fill="currentColor"
      stroke="currentColor"
    />
    <path
      in:fade|global={{
        duration: disableAnimation ? 0 : fadeDuration,
        easing: quintInOut
      }}
      d="M361.689 253.534V252.815L361.016 253.065C353.505 255.845 348.091 262.954 348.091 271.608C348.091 280.249 353.495 287.677 361.033 290.157L361.689 290.373V289.682V253.534Z"
      fill="currentColor"
      stroke="currentColor"
    />
    <path
      in:fade|global={{
        duration: disableAnimation ? 0 : fadeDuration,
        easing: quintInOut
      }}
      d="M361.689 313.179V312.679H361.189H361.153H361.117H361.081H361.045H361.009H360.973H360.937H360.901H360.865H360.829H360.793H360.757H360.721H360.685H360.649H360.613H360.577H360.541H360.504H360.468H360.432H360.396H360.36H360.324H360.288H360.252H360.216H360.18H360.144H360.108H360.072H360.036H360H359.964H359.928H359.892H359.856H359.82H359.783H359.747H359.711H359.675H359.639H359.603H359.567H359.531H359.495H359.459H359.423H359.387H359.351H359.315H359.279H359.243H359.207H359.171H359.135H359.099H359.062H359.026H358.99H358.954H358.918H358.882H358.846H358.81H358.774H358.738H358.702H358.666H358.63H358.594H358.558H358.522H358.486H358.45H358.414H358.378H358.341H358.305H358.269H358.233H358.197H358.161H358.125H358.089H358.053H358.017H357.981H357.945H357.909H357.873H357.837H357.801H357.765H357.729H357.693H357.657H357.62H357.584H357.548H357.512H357.476H357.44H357.404H357.368H357.332H357.296H357.26H357.224H357.188H357.152H357.116H357.08H357.044H357.008H356.972H356.936H356.899H356.863H356.827H356.791H356.755H356.719H356.683H356.647H356.611H356.575H356.539H356.503H356.467H356.431H356.395H356.359H356.323H356.287H356.251H356.215H356.179H356.142H356.106H356.07H356.034H355.998H355.962H355.926H355.89H355.854H355.818H355.782H355.746H355.71H355.674H355.638H355.602H355.566H355.53H355.494H355.458H355.421H355.385H355.349H355.313H355.277H355.241H355.205H355.169H355.133H355.097H355.061H355.025H354.989H354.953H354.917H354.881H354.845H354.809H354.773H354.737H354.7H354.664H354.628H354.592H354.556H354.52H354.484H354.448H354.412H354.376H354.34H354.304H354.268H354.232H354.196H354.16H354.124H354.088H354.052H354.016H353.979H353.943H353.907H353.871H353.835H353.799H353.763H353.727H353.691H353.655H353.619H353.583H353.547H353.511H353.475H353.439H353.403H353.367H353.331H353.295H353.258H353.222H353.186H353.15H353.114H353.078H353.042H353.006H352.97H352.934H352.898H352.862H352.826H352.79H352.754H352.718H352.682H352.646H352.61H352.574H352.537H352.501H352.465H352.429H352.393H352.357H352.321H352.285H352.249H352.213H352.177H352.141H352.105H352.069H352.033H351.997H351.961H351.925H351.889H351.853H351.816H351.78H351.744H351.708H351.672H351.636H351.6H351.564H351.528H351.492H351.456H351.42H351.384H351.348H351.312H351.276H351.24H351.204H351.168H351.132H351.095H351.059H351.023H350.987H350.951H350.915H350.879H350.843H350.807H350.771H350.735H350.699H350.663H350.627H350.591H350.555H350.519H350.483H350.447H350.411H350.374H350.338H350.302H350.266H350.23H350.194H350.158H350.122H350.086H350.05H350.014H349.978H349.942H349.906H349.87H349.834H349.798H349.762H349.726H349.69H349.653H349.617H349.581H349.545H349.509H349.473H349.437H349.401H349.365H349.329H349.293H349.257H349.221H349.185H349.149H349.113H349.077H349.041H349.005H348.969H348.932H348.896H348.86H348.824H348.788H348.752H348.716H348.68H348.644H348.608H348.572H348.536H348.5H348.464H348.428H348.392H348.356H348.32H348.284H348.248H348.212H348.175H348.139H348.103H348.067H348.031H347.995H347.959H347.923H347.887H347.851H347.815H347.779H347.743H347.707H347.671H347.635H347.599H347.563H347.527H347.491H347.454H347.418H347.382H347.346H347.31H347.274H347.238H347.202H347.166H347.13H347.094H347.058H347.022H346.986H346.95H346.914H346.878H346.842H346.806H346.77H346.733H346.697H346.661H346.625H346.589H346.553H346.517H346.481H346.445H346.409H346.373H346.337H346.301H346.265H346.229H346.193H346.157H346.121H346.085H346.049H346.012H345.976H345.94H345.904H345.868H345.832H345.796H345.76H345.724H345.688H345.652H345.616H345.58H345.544H345.508H345.472H345.436H345.4H345.364H345.328H345.291H345.255H345.219H345.183H345.147H345.111H345.075H345.039H345.003H344.967H344.931H344.895H344.859H344.823H344.787H344.751H344.715H344.679H344.643H344.607H344.57H344.534H344.498H344.462H344.426H344.39H344.354H344.318H344.282H344.246H344.21H344.174H344.138H344.102H344.066H344.03H343.994H343.958H343.922H343.886H343.849H343.813H343.777H343.741H343.705H343.669H343.633H343.597H343.561H343.525H343.489H343.453H343.417H343.381H343.345H343.309H343.273H343.237H343.201H343.165H343.128H343.092H343.056H343.02H342.984H342.948H342.912H342.876H342.84H342.804H342.768H342.732H342.232V313.179C342.232 325.161 350.301 334.989 361.052 338.06L361.689 338.242V337.579V313.179Z"
      fill="currentColor"
      stroke="currentColor"
    />
    <path
      in:fade|global={{
        duration: disableAnimation ? 0 : fadeDuration,
        easing: quintInOut
      }}
      d="M384.655 271.108H377.252H376.752V271.608V274.621V275.121H377.252H388.092H388.592V274.621V271.608C388.592 260.802 379.885 251.829 369.342 251.829C369.328 251.829 369.315 251.829 369.302 251.829C368.447 251.829 367.208 251.829 366.25 252.157L365.912 252.273V252.63V254.137V255.643V287.875V289.381V290.888V291.388H366.412C366.779 291.388 367.149 291.446 367.597 291.518C367.628 291.522 367.658 291.527 367.689 291.532C368.168 291.608 368.714 291.689 369.342 291.689C381.065 291.689 390.522 301.393 390.522 313.48C390.522 325.396 381.332 334.995 369.842 335.266V313.179V312.679H369.342H366.412H365.912V313.179V335.17V336.676V338.182V338.682H366.412C366.779 338.682 367.149 338.741 367.597 338.812L367.689 338.826C368.168 338.902 368.714 338.983 369.342 338.983C383.108 338.983 394.159 327.6 394.159 313.48C394.159 299.532 383.374 288.254 369.842 287.983V256.418C377.931 256.125 384.407 262.724 384.655 271.108Z"
      fill="currentColor"
      stroke="currentColor"
    />
  </svg>
</div>
