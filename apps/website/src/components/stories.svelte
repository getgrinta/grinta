<script lang="ts">
  import { PlayIcon } from "lucide-svelte";
  import VideoModal from "./video-modal.svelte";

  const STORIES = [
    {
      id: "story-1",
      thumbnailUrl: "/stories_1.jpg",
      videoUrl: "https://streamable.com/e/iajjre?autoplay=1",
      title: "Powerful Notes",
      description:
        "Grinta offers a note taker that predicts the next few words you're about to write. Simply click Tab to accept the prediction.",
      docsUrl: "/features/notes",
    },
    {
      id: "story-2",
      thumbnailUrl: "/stories_2.jpg",
      videoUrl: "https://streamable.com/e/m1u47q?autoplay=1",
      title: "Agentic Web Browsing",
      description:
        "Wave is the additional pair of agentic eyes to help you navigate the web. It can search for information, answer questions, and even take actions on your behalf.",
      docsUrl: "/guides",
    },
    {
      id: "story-3",
      thumbnailUrl: "/stories_3.jpg",
      videoUrl: "https://streamable.com/e/wtqz13?autoplay=1",
      title: "Calendar Peak",
      description:
        "Grinta Calendar Peak is a feature that allows you to see the most important events in your calendar at a glance.",
      docsUrl: "/guides",
    },
  ];
</script>

<section
  class="container px-4 xl:px-0 max-w-[80rem] grid grid-cols-1 lg:grid-cols-3 mx-auto mt-32 gap-8 rounded-[2rem]"
>
  {#each STORIES as story}
    <div class="card bg-base-100 shadow-sm">
      <figure class="relative">
        <PlayIcon
          size={40}
          class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        />
        <VideoModal id={story.id} thumbnailUrl={story.thumbnailUrl}>
          <div
            style="position:relative; width:100%; height:0px; padding-bottom:64.982%"
          >
            <iframe
              allow="fullscreen;autoplay"
              allowfullscreen
              height="100%"
              src={story.videoUrl}
              title="Video"
              width="100%"
              style="border:none; width:100%; height:100%; position:absolute; left:0px; top:0px; overflow:hidden;"
            ></iframe>
          </div>
        </VideoModal>
      </figure>
      <div class="card-body">
        <h2 class="card-title">{story.title}</h2>
        <p>
          {story.description}
        </p>
        <div class="card-actions justify-end">
          <a class="btn btn-primary" href={story.docsUrl}>Learn More</a>
        </div>
      </div>
    </div>
  {/each}
</section>
