<script lang="ts">
  import { goto } from "$app/navigation";
  import { getAuthClient } from "$lib/auth";
  import TopBar from "$lib/components/top-bar.svelte";
  import { appStore } from "$lib/store/app.svelte";
  import { vaultStore } from "$lib/store/vault.svelte";
  import { createForm } from "felte";
  import { toast } from "svelte-sonner";
  import { z, ZodError } from "zod/v3";
  import { _ } from "$lib/i18n";

  const SignInSchema = z.object({
    token: z.string(),
  });

  let interactionDisabled = $state(false);

  const { form } = createForm({
    schema: SignInSchema,
    onSubmit: async (values: z.infer<typeof SignInSchema>) => {
      console.log(">>>VAL", values);
      const authClient = getAuthClient();
      interactionDisabled = true;
      try {
        const { error } = await authClient.oneTimeToken.verify(values, {
          async onSuccess(context) {
            console.log(">>>DATA", context.response.headers.getSetCookie());
            const authCookie = context.response.headers.getSetCookie()?.[0];
            if (!authCookie) {
              throw new Error("Auth cookie not found");
            }
            await vaultStore.setAuthCookie(authCookie);
            await appStore.fetchSession();
            return goto("/profile");
          },
        });
        if (error) {
          console.error(">>>ERROR", error);
          throw error;
        }
      } catch (error) {
        interactionDisabled = false;
        console.error(">>>ERROR", error);
        toast.error($_("auth.invalidToken"));
      }
    },
    onError: (error) => {
      interactionDisabled = false;
      if (error instanceof ZodError) {
        const validationObject = JSON.parse(error?.message)[0];

        let errorMessage = validationObject.message;
        if (validationObject.path[0] === "token") {
          errorMessage = $_("auth.invalidToken");
        }
        return toast.error(errorMessage);
      }
      if (error instanceof Error) {
        return toast.error(error.message);
      }
    },
  });
</script>

<div class="flex flex-1 flex-col">
  <TopBar>
    <h1 slot="input" class="text-lg font-semibold flex-1">
      {$_("auth.signIn")}
    </h1>
    <a
      href="https://getgrinta.com/guides"
      slot="addon"
      target="_blank"
      rel="noopener noreferrer"
      class="btn btn-sm">{$_("auth.help")}</a
    >
  </TopBar>
  <div class="flex flex-col flex-1 mt-20 gap-4 items-center justify-center">
    <form use:form class="flex flex-col w-full max-w-[28rem] gap-4">
      <p>{$_("auth.oneTimePasswordInfo")}</p>
      <label for="token" class="label">{$_("auth.oneTimeToken")}</label>
      <input
        id="tokenField"
        disabled={interactionDisabled}
        placeholder={$_("auth.oneTimeTokenPlaceholder")}
        name="token"
        class="input w-full"
      />
      <button type="submit" disabled={interactionDisabled} class="btn"
        >{$_("auth.verifyCode")}</button
      >
    </form>
  </div>
</div>
