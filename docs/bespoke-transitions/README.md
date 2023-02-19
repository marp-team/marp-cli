# Slide transitions in `bespoke` template

Marp CLI's `bespoke` HTML template supports **slide transition animations**, that will be triggered when the slide page was changed, by setting the `transition` local directive.

- **[Prerequisite](#prerequisite)**
- **[`transition` local directive](#transition-local-directive)**
- **[Custom transitions](#custom-transitions)**
- **[Morphing animations](#morphing-animations)**
- **[Opt-out transitions](#opt-out-transitions)**

## Prerequisite

The slide transition depends on **[View Transitions] API** in the using browser. _We does never lock in to a specific JavaScript library_, as same as other Marp ecosystem projects :)

To show transition animations, a viewer has to show HTML slide in the browser which have supported View Transitions.

[view transitions]: https://www.w3.org/TR/css-view-transitions-1/

### Supported browsers

- **Chrome**: ✅ (111-)
- **Edge**: ✅ (111-)
- **Firefox**: :x:
- **Safari**: :x:

## `transition` local directive

You can choose a transition effect for slide(s) by defining `transition` local directive in your Markdown.

```markdown
---
transition: fade
---

# First page

---

# Second page
```

[As same as other local directives][local directives], you can change the kind of transition in the middle of slides by defining the transition directive through HTML comment, or apply a specific transition into a single slide by using a scoped local directive `_transition`.

[local directives]: https://marpit.marp.app/directives?id=local-directives-1

```markdown
---
transition: fade
---

# Fade transition

---

<!-- transition: cover -->

Changed the kind of transition to `cover`.

---

<!-- _transition: none -->

Disabled transition for this slide.

---

Got back cover transition.
```

`transition` directive means to set the animation to **"the next slide boundary (`---`)"**. So setting `transition` directive on the last slide would have no meaning.

### Built-in transitions

Marp CLI has provided useful [33 built-in transitions](../../src/engine/transition/keyframes/) out of the box. [You also can see the showcase of all transitions](https://marp-cli-page-transitions.glitch.me/) in the supported browser.

<table align="center">
  <tbody>
    <tr>
      <td align="center" valign="bottom"><b>none</b></td>
      <td align="center" valign="bottom">
        <a href="https://marp-cli-page-transitions.glitch.me/#2">
          <img src="./images/clockwise.gif" width="128" height="72" /><br />
          <b>clockwise</b>
        </a>
      </td>
      <td align="center" valign="bottom">
        <a href="https://marp-cli-page-transitions.glitch.me/#3">
          <img src="./images/counterclockwise.gif" width="128" height="72" /><br />
          <b>counterclockwise</b>
        </a>
      </td>
      <td align="center" valign="bottom">
        <a href="https://marp-cli-page-transitions.glitch.me/#4">
          <img src="./images/cover.gif" width="128" height="72" /><br />
          <b>cover</b>
        </a>
      </td>
    </tr>
    <tr>
      <td align="center" valign="bottom">
        <a href="https://marp-cli-page-transitions.glitch.me/#5">
          <img src="./images/coverflow.gif" width="128" height="72" /><br />
          <b>coverflow</b>
        </a>
      </td>
      <td align="center" valign="bottom">
        <a href="https://marp-cli-page-transitions.glitch.me/#6">
          <img src="./images/cube.gif" width="128" height="72" /><br />
          <b>cube</b>
        </a>
      </td>
      <td align="center" valign="bottom">
        <a href="https://marp-cli-page-transitions.glitch.me/#7">
          <img src="./images/cylinder.gif" width="128" height="72" /><br />
          <b>cylinder</b>
        </a>
      </td>
      <td align="center" valign="bottom">
        <a href="https://marp-cli-page-transitions.glitch.me/#8">
          <img src="./images/diamond.gif" width="128" height="72" /><br />
          <b>diamond</b>
        </a>
      </td>
    </tr>
    <tr>
      <td align="center" valign="bottom">
        <a href="https://marp-cli-page-transitions.glitch.me/#9">
          <img src="./images/drop.gif" width="128" height="72" /><br />
          <b>drop</b>
        </a>
      </td>
      <td align="center" valign="bottom">
        <a href="https://marp-cli-page-transitions.glitch.me/#10">
          <img src="./images/explode.gif" width="128" height="72" /><br />
          <b>explode</b>
        </a>
      </td>
      <td align="center" valign="bottom">
        <a href="https://marp-cli-page-transitions.glitch.me/#11">
          <img src="./images/fade.gif" width="128" height="72" /><br />
          <b>fade</b>
        </a>
      </td>
      <td align="center" valign="bottom">
        <a href="https://marp-cli-page-transitions.glitch.me/#12">
          <img src="./images/fade-out.gif" width="128" height="72" /><br />
          <b>fade-out</b>
        </a>
      </td>
    </tr>
    <tr>
      <td align="center" valign="bottom">
        <a href="https://marp-cli-page-transitions.glitch.me/#13">
          <img src="./images/fall.gif" width="128" height="72" /><br />
          <b>fall</b>
        </a>
      </td>
      <td align="center" valign="bottom">
        <a href="https://marp-cli-page-transitions.glitch.me/#14">
          <img src="./images/flip.gif" width="128" height="72" /><br />
          <b>flip</b>
        </a>
      </td>
      <td align="center" valign="bottom">
        <a href="https://marp-cli-page-transitions.glitch.me/#15">
          <img src="./images/glow.gif" width="128" height="72" /><br />
          <b>glow</b>
        </a>
      </td>
      <td align="center" valign="bottom">
        <a href="https://marp-cli-page-transitions.glitch.me/#16">
          <img src="./images/implode.gif" width="128" height="72" /><br />
          <b>implode</b>
        </a>
      </td>
    </tr>
    <tr>
      <td align="center" valign="bottom">
        <a href="https://marp-cli-page-transitions.glitch.me/#17">
          <img src="./images/in-out.gif" width="128" height="72" /><br />
          <b>in-out</b>
        </a>
      </td>
      <td align="center" valign="bottom">
        <a href="https://marp-cli-page-transitions.glitch.me/#18">
          <img src="./images/iris-in.gif" width="128" height="72" /><br />
          <b>iris-in</b>
        </a>
      </td>
      <td align="center" valign="bottom">
        <a href="https://marp-cli-page-transitions.glitch.me/#19">
          <img src="./images/iris-out.gif" width="128" height="72" /><br />
          <b>iris-out</b>
        </a>
      </td>
      <td align="center" valign="bottom">
        <a href="https://marp-cli-page-transitions.glitch.me/#20">
          <img src="./images/melt.gif" width="128" height="72" /><br />
          <b>melt</b>
        </a>
      </td>
    </tr>
    <tr>
      <td align="center" valign="bottom">
        <a href="https://marp-cli-page-transitions.glitch.me/#21">
          <img src="./images/overlap.gif" width="128" height="72" /><br />
          <b>overlap</b>
        </a>
      </td>
      <td align="center" valign="bottom">
        <a href="https://marp-cli-page-transitions.glitch.me/#22">
          <img src="./images/pivot.gif" width="128" height="72" /><br />
          <b>pivot</b>
        </a>
      </td>
      <td align="center" valign="bottom">
        <a href="https://marp-cli-page-transitions.glitch.me/#23">
          <img src="./images/pull.gif" width="128" height="72" /><br />
          <b>pull</b>
        </a>
      </td>
      <td align="center" valign="bottom">
        <a href="https://marp-cli-page-transitions.glitch.me/#24">
          <img src="./images/push.gif" width="128" height="72" /><br />
          <b>push</b>
        </a>
      </td>
    </tr>
    <tr>
      <td align="center" valign="bottom">
        <a href="https://marp-cli-page-transitions.glitch.me/#25">
          <img src="./images/reveal.gif" width="128" height="72" /><br />
          <b>reveal</b>
        </a>
      </td>
      <td align="center" valign="bottom">
        <a href="https://marp-cli-page-transitions.glitch.me/#26">
          <img src="./images/rotate.gif" width="128" height="72" /><br />
          <b>rotate</b>
        </a>
      </td>
      <td align="center" valign="bottom">
        <a href="https://marp-cli-page-transitions.glitch.me/#27">
          <img src="./images/slide.gif" width="128" height="72" /><br />
          <b>slide</b>
        </a>
      </td>
      <td align="center" valign="bottom">
        <a href="https://marp-cli-page-transitions.glitch.me/#28">
          <img src="./images/star.gif" width="128" height="72" /><br />
          <b>star</b>
        </a>
      </td>
    </tr>
    <tr>
      <td align="center" valign="bottom">
        <a href="https://marp-cli-page-transitions.glitch.me/#29">
          <img src="./images/swap.gif" width="128" height="72" /><br />
          <b>swap</b>
        </a>
      </td>
      <td align="center" valign="bottom">
        <a href="https://marp-cli-page-transitions.glitch.me/#30">
          <img src="./images/swipe.gif" width="128" height="72" /><br />
          <b>swipe</b>
        </a>
      </td>
      <td align="center" valign="bottom">
        <a href="https://marp-cli-page-transitions.glitch.me/#31">
          <img src="./images/swoosh.gif" width="128" height="72" /><br />
          <b>swoosh</b>
        </a>
      </td>
      <td align="center" valign="bottom">
        <a href="https://marp-cli-page-transitions.glitch.me/#32">
          <img src="./images/wipe.gif" width="128" height="72" /><br />
          <b>wipe</b>
        </a>
      </td>
    </tr>
    <tr>
      <td align="center" valign="bottom">
        <a href="https://marp-cli-page-transitions.glitch.me/#33">
          <img src="./images/wiper.gif" width="128" height="72" /><br />
          <b>wiper</b>
        </a>
      </td>
      <td align="center" valign="bottom">
        <a href="https://marp-cli-page-transitions.glitch.me/#34">
          <img src="./images/zoom.gif" width="128" height="72" /><br />
          <b>zoom</b>
        </a>
      </td>
      <td></td>
      <td></td>
    </tr>
  </tbody>
</table>

> **Note**
> If the viewer has enabled the reduce motion feature on their device, the transition animation will be forced to a simple `fade` animation regardless of the specified transition. See also "[Reduce transitions by a viewer](#reduce-transitions-by-a-viewer)".

### Duration

The default duration of transition is `0.5s` in all built-in transitions, but you can set custom duration by adding a space-separated parameter to `transition` directive definition.

```yaml
transition: fade 1s
```

The custom duration accepts a unit `s` or `ms`.

## Custom transitions

You also can define the custom transitions and animations, both in theme CSS and Markdown inline style. We provide unlimited extensibillity of your own transitions with your creativity.

For making custom transitions, all you have to know is only about CSS. Define animation [`@keyframes`](https://developer.mozilla.org/en-US/docs/Web/CSS/@keyframes), with a specific keyframe name ruled by Marp. There are no extra plugins and JavaScript codes.

Marp prefers the custom transition if defined the transition with same name as built-in transitions.

> See also our blog article: **"[Marp CLI: How to make custom transition](https://marp.app/blog/how-to-make-custom-transition)"**

### Simple keyframe declaration

Declare a disappearing animation with the keyframe name **`marp-transition-XXXXXXXX`**.

```css
/* Define `dissolve` transition */
@keyframes marp-transition-dissolve {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
```

When this transition is triggered, the current slide is animated with this keyframe, and the new slide is animated in the opposite direction too.

### Split animation keyframes

For defining different animations into both slide pages, you can use the prefixed keyframe name **`marp-outgoing-transition-XXXXXXXX`** and **`marp-incoming-transition-XXXXXXXX`**.

```css
/* Define `slide-up` transition */
/* WARN: Incomplete example. See also "Backward navigation". */
@keyframes marp-outgoing-transition-slide-up {
  from {
    transform: translateY(0%);
  }
  to {
    transform: translateY(-100%);
  }
}
@keyframes marp-incoming-transition-slide-up {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0%);
  }
}
```

The outgoing transition should declare a disappearing animation, and the incoming transition should declare an appearing animation.

### Backward navigation

If the transition should have the different moving for the backward navigation, we are providing several solutions for that.

#### `--marp-transition-direction` CSS variable

While the transition is playing, `--marp-transition-direction` [CSS custom property (CSS variables)](https://developer.mozilla.org/docs/Web/CSS/Using_CSS_custom_properties) will be available in keyframes.

It returns `1` for forward navigation, or `-1` for backward navigation. It's helpful to set keyframe declarations that have been calculated by the navigation direction using [`calc()`](https://developer.mozilla.org/en-US/docs/Web/CSS/calc).

```css
/* Define an improved `slide-up` transition, with better backward navigation */
@keyframes marp-outgoing-transition-slide-up {
  from {
    transform: translateY(0%);
  }
  to {
    transform: translateY(calc(var(--marp-transition-direction, 1) * -100%));
  }
}
@keyframes marp-incoming-transition-slide-up {
  from {
    transform: translateY(calc(var(--marp-transition-direction, 1) * 100%));
  }
  to {
    transform: translateY(0%);
  }
}
```

#### Custom animations for backward transition

Alternatively, you also can set extra animation keyframes that are specific for backward navigation.

Declare animation keyframes with the name that has prefixed `backward-` to the custom transition name, just like as **`marp-transition-backward-XXXXXXXX`**.

```css
/* Define `triangle` transition */
@keyframes marp-incoming-transition-triangle {
  /* Wipe effect from left top */
  from {
    clip-path: polygon(0% 0%, 0% 0%, 0% 0%);
  }
  to {
    clip-path: polygon(0% 0%, 200% 0%, 0% 200%);
  }
}

@keyframes marp-incoming-transition-backward-triangle {
  /* Wipe effect from right bottom */
  from {
    clip-path: polygon(100% 100%, 100% 100%, 100% 100%);
  }
  to {
    clip-path: polygon(-100% 100%, 100% -100%, 100% 100%);
  }
}
```

In backward navigation, each slide pages will try to use the backward keyframes first, and fallback to the normal keyframes if not declared.

You can avoid the unintended fallback by setting an empty `@keyframes` declaration for the backward animation.

```css
/* Define `zoom-out` transition */
@keyframes marp-outgoing-transition-zoom-out {
  from {
    transform: scale(1);
  }
  to {
    transform: scale(0);
  }
}
@keyframes marp-incoming-transition-zoom-out {
  /* Send the layer for new slide to back (See also "Layer order") */
  from,
  to {
    z-index: -1;
  }
}

@keyframes marp-outgoing-transition-backward-zoom-out {
  /****** Declare empty keyframes to disable fallback ******/
}
@keyframes marp-incoming-transition-backward-zoom-out {
  from {
    transform: scale(0);
  }
  to {
    transform: scale(1);
  }
}
```

### Set default duration

The custom transition has a `0.5s` duration by default.

If you want to set a different default duration for your custom transition, please set `--marp-transition-duration` property to the first keyframe (`from` or `0%`).

```css
/** Declare `gate` transition */
@keyframes marp-incoming-transition-gate {
  from {
    /* ⬇️ Set the default duration as 1 second. ⬇️ */
    --marp-transition-duration: 1s;

    clip-path: inset(0 50%);
  }
  to {
    clip-path: inset(0);
  }
}

@keyframes marp-outgoing-transition-backward-gate {
  from {
    /* You also can set a different duration for backward transition as necessary. */
    /* --marp-transition-duration: 1.5s; */

    clip-path: inset(0);
  }
  to {
    clip-path: inset(0 50%);
  }
}
@keyframes marp-incoming-transition-backward-gate {
  from,
  to {
    z-index: -1;
  }
}
```

Please note that [the slide author can override the default duration at any time, through the `transition` local directive in Markdown](#duration).

### Layer order

The incoming slide layer always will be stacked on the top of the outgoing slide layer.

According to the kind of transition, this order may be not suitable. So you can send the incoming slide to back by using [`z-index: -1`](https://developer.mozilla.org/en-US/docs/Web/CSS/z-index).

```css
@keyframes marp-incoming-transition-XXXXXXXX {
  from,
  to {
    z-index: -1;
  }
}
```

If you want to swap the order of layers during animation, try to animate `z-index` property.

```css
/** Declare `swap` transition */
@keyframes marp-incoming-transition-swap {
  /* Incoming slide will swap from back to front at 50% of animation */
  from {
    z-index: -1;
  }
  to {
    z-index: 0;
  }

  /* Declarations for moving animation */
  0% {
    transform: translateX(0);
  }
  50% {
    transform: translateX(50%);
  }
  100% {
    transform: translateX(0);
  }
}

@keyframes marp-outgoing-transition-swap {
  0% {
    transform: translateX(0);
  }
  50% {
    transform: translateX(-50%);
  }
  100% {
    transform: translateX(0);
  }
}
```

> `z-index` is always taking an integer value, and interpolated `z-index` value by animation does not take any decimal points too.

## Morphing animations

View Transitions API also provides smooth moving animation during the transition, for specific two elements before and after the transition. It gives a very similar effect to PowerPoint's Morph transition and Keynote's Magic Move, just by simple CSS declarations.

If there were marked elements with the same name by [`view-transition-name` CSS property][view-transition-name] in a old page and new page between transition, the `bespoke` template will apply morphing animation automatically.

[view-transition-name]: https://www.w3.org/TR/css-view-transitions-1/#view-transition-name-prop

The slide author can visualize the relationship between the different elements in the two different pages. It's helpful for creating a more engaging presentation for the audience.

<p align="center">
  <img src="./images/morphing-animation.gif" alt="Morph animation example" width="480" height="270" />
</p>

If there were multiple pairs defined by `view-transition-name` CSS property with different names, each elements will morph at the same time. Elements that were not marked by `view-transition-name` still follow the selected animation by `transition` local directive.

> **Warning** Each morphable elements marked by `view-transition-name` must have uniquely named in a slide page. If there were multiple elements named by `view-transition-name` with the same name in a single page, View Transition API does not apply _the whole of transition animation_.

### Example

In this example, the icon image of "1" on every page is marked as morphable elements named "one" by `view-transition-name` CSS property.

Generally setting [`contain` CSS property][contain] as `layout` or `paint` is also required together with `view-transition-name`. If it lacked, the browser may ignore the morph transition with the error `Shared element must contain paint or layout`.

[contain]: https://developer.mozilla.org/en-US/docs/Web/CSS/contain

```markdown
---
theme: gaia
transition: fade
style: |
  /* ⬇️ Mark the image of "1" in every pages as morphable image named as "one" ⬇️ */
  img[alt="1"] {
    view-transition-name: one;
    contain: layout; /* required */
  }

  /* Generic image styling for number icons */
  img:is([alt="1"], [alt="2"], [alt="3"]) {
    height: 64px;
    position: relative;
    top: -0.1em;
    vertical-align: middle;
    width: 64px;
  }
---

# Today's topics

- ![1](https://icongr.am/material/numeric-1-circle.svg?color=666666) Introduction
- ![2](https://icongr.am/material/numeric-2-circle.svg?color=666666) Features
- ![3](https://icongr.am/material/numeric-3-circle.svg?color=666666) Conclusion

---

<!-- _class: lead -->

![1 w:256 h:256](https://icongr.am/material/numeric-1-circle.svg?color=ff9900)

# Introduction

---

# ![1](https://icongr.am/material/numeric-1-circle.svg?color=666666) Introduction

Marp is an open-sourced Markdown presentation ecosystem.

It provides a writing experience of presentation slides by Markdown.
```

#### Use HTML to mark morphable contents

By using an inline HTML with enabling raw HTML rendering by `--html` Marp CLI option, you can mark a group of morphable contents with more flexibility.

This example is defining the style of `morph` class, to mark the inner elements as morphable.

```markdown
---
header: Bubble sort
transition: fade
style: |
  /* Define the style of "morph" class */
  .morph {
    display: inline-block;
    view-transition-name: var(--morph-name);
    contain: layout;
    vertical-align: top;
  }

  /* Global style */
  section {
    font-size: 60px;
  }
---

<span class="morph" style="--morph-name:b7;">███████</span> 7
<span class="morph" style="--morph-name:b5;">█████</span> 5
<span class="morph" style="--morph-name:b3;">███</span> 3
<span class="morph" style="--morph-name:b9;">█████████</span> 9

---

<span class="morph" style="--morph-name:b5;">█████</span> 5
<span class="morph" style="--morph-name:b7;">███████</span> 7
<span class="morph" style="--morph-name:b3;">███</span> 3
<span class="morph" style="--morph-name:b9;">█████████</span> 9

---

<span class="morph" style="--morph-name:b5;">█████</span> 5
<span class="morph" style="--morph-name:b3;">███</span> 3
<span class="morph" style="--morph-name:b7;">███████</span> 7
<span class="morph" style="--morph-name:b9;">█████████</span> 9

---

<span class="morph" style="--morph-name:b3;">███</span> 3
<span class="morph" style="--morph-name:b5;">█████</span> 5
<span class="morph" style="--morph-name:b7;">███████</span> 7
<span class="morph" style="--morph-name:b9;">█████████</span> 9
```

The name of group can set through CSS variable in `style` attribute.

<p align="center">
  <img src="./images/morphing-animation-2.gif" alt="Use HTML to mark morphable contents" width="480" height="270" />
</p>

Due to the security reason, Marp CLI does not render raw HTML tags in Markdown by default. You have to should add `--html` option to use inline HTMLs.

```bash
marp morphable.md --html
```

## Opt-out transitions

### Disable transitions by CLI option

The transition is an optional feature in bespoke template, and it's enabled by default. You can opt out the transition support by adding CLI option `--bespoke.transition=false`.

```sh
marp --bespoke.transition=false markdown.md
```

This option is also useful when using [a customized engine](../../README.md#functional-engine) that has supported `transition` custom local directive for another approach.

### Reduce transitions by a viewer

_Even if the slide author used transitions,_ every viewer do not always prefer to see dizzy animations. [Reducing motion is important especially for people with vestibular disorders.](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html)

If the browser has detected that the viewer set a setting an operating system preference to reduce motions and animations in the interface, every effects by transitions will force to a simple `fade` animation.

If you want to know details about why required this, see the article "[`prefers-reduced-motion`: Sometimes less movement is more](https://web.dev/prefers-reduced-motion/)" by [web.dev](https://web.dev/).
