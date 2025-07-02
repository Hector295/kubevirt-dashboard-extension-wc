<script>
import { LabeledInput } from '@rancher/components';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import { get, set } from '@shell/utils/object';

export default {
  name: 'VMBasicConfig',
  components: {
    LabeledInput,
  },

  props: {
    value: {
      type: Object,
      required: true,
    },
    mode: {
      type: String,
      required: true,
    },
  },

  data() {
    return {
      tempLabels: [],
      tempAnnotations: [],
    };
  },

  computed: {
    isView() {
      return this.mode === 'view';
    },

    vmLabels: {
      get() {
        return this.tempLabels;
      },
      set(newValue) {
        this.tempLabels = newValue;
        this.syncLabelsToMetadata();
      },
    },

    vmAnnotations: {
      get() {
        return this.tempAnnotations;
      },
      set(newValue) {
        this.tempAnnotations = newValue;
        this.syncAnnotationsToMetadata();
      },
    },

    description: {
      get() {
        return get(this.value, 'metadata.annotations.description') || '';
      },
      set(newValue) {
        if (newValue) {
          set(this.value, 'metadata.annotations.description', newValue);
        } else {
          const annotations = { ...get(this.value, 'metadata.annotations') };
          delete annotations.description;
          set(this.value, 'metadata.annotations', annotations);
        }
      },
    },
  },

  created() {
    this.ensureMetadataStructure();
    this.loadLabelsAndAnnotations();
  },

  methods: {
    ensureMetadataStructure() {
      if (!this.value.metadata) {
        set(this.value, 'metadata', {});
      }
      if (!this.value.metadata.labels) {
        set(this.value, 'metadata.labels', {});
      }
      if (!this.value.metadata.annotations) {
        set(this.value, 'metadata.annotations', {});
      }
    },

    loadLabelsAndAnnotations() {
      const labels = get(this.value, 'metadata.labels') || {};
      const editableLabels = {};
      Object.entries(labels).forEach(([key, value]) => {
        if (!key.startsWith('kubevirt.io/') && !key.startsWith('cattle.io/')) {
          editableLabels[key] = value;
        }
      });
      this.tempLabels = Object.entries(editableLabels).map(([key, value]) => ({ key, value }));
      const annotations = get(this.value, 'metadata.annotations') || {};
      const editableAnnotations = {};
      Object.entries(annotations).forEach(([key, value]) => {
        if (
          !key.startsWith('kubevirt.io/') &&
          !key.startsWith('cattle.io/') &&
          key !== 'description'
        ) {
          editableAnnotations[key] = value;
        }
      });
      this.tempAnnotations = Object.entries(editableAnnotations).map(([key, value]) => ({
        key,
        value,
      }));
    },

    syncLabelsToMetadata() {
      const currentLabels = get(this.value, 'metadata.labels') || {};
      const systemLabels = {};
      Object.entries(currentLabels).forEach(([key, value]) => {
        if (key.startsWith('kubevirt.io/') || key.startsWith('cattle.io/')) {
          systemLabels[key] = value;
        }
      });

      const userLabels = {};
      this.tempLabels.forEach(({ key, value }) => {
        if (key && value && key.trim() && value.trim()) {
          userLabels[key.trim()] = value.trim();
        }
      });

      set(this.value, 'metadata.labels', { ...systemLabels, ...userLabels });
    },

    syncAnnotationsToMetadata() {
      const currentAnnotations = get(this.value, 'metadata.annotations') || {};
      const systemAnnotations = {};
      Object.entries(currentAnnotations).forEach(([key, value]) => {
        if (
          key.startsWith('kubevirt.io/') ||
          key.startsWith('cattle.io/') ||
          key === 'description'
        ) {
          systemAnnotations[key] = value;
        }
      });

      const userAnnotations = {};
      this.tempAnnotations.forEach(({ key, value }) => {
        if (key && value && key.trim() && value.trim()) {
          userAnnotations[key.trim()] = value.trim();
        }
      });

      set(this.value, 'metadata.annotations', { ...systemAnnotations, ...userAnnotations });
    },

    addLabel() {
      this.tempLabels.push({ key: '', value: '' });
    },

    removeLabel(index) {
      this.tempLabels.splice(index, 1);
      this.syncLabelsToMetadata();
    },

    addAnnotation() {
      this.tempAnnotations.push({ key: '', value: '' });
    },

    removeAnnotation(index) {
      this.tempAnnotations.splice(index, 1);
      this.syncAnnotationsToMetadata();
    },
  },

  watch: {
    tempLabels: {
      handler() {
        this.syncLabelsToMetadata();
      },
      deep: true,
    },

    tempAnnotations: {
      handler() {
        this.syncAnnotationsToMetadata();
      },
      deep: true,
    },
  },
};
</script>

<template>
  <div>
    <div class="row mb-20">
      <div class="col span-12">
        <LabeledInput
          v-model:value="description"
          :mode="mode"
          label="Description"
          placeholder="Enter description"
          type="multiline"
          :min-height="60"
        />
      </div>
    </div>

    <div class="row mb-20">
      <div class="col span-12">
        <h3>Labels</h3>
        <div v-for="(label, index) in vmLabels" :key="`label-${index}`" class="row mb-10">
          <div class="col span-5">
            <LabeledInput
              v-model:value="label.key"
              :mode="mode"
              label="Key"
              placeholder="Enter key"
            />
          </div>
          <div class="col span-5">
            <LabeledInput
              v-model:value="label.value"
              :mode="mode"
              label="Value"
              placeholder="Enter value"
            />
          </div>
          <div class="col span-2">
            <button
              v-if="!isView"
              type="button"
              class="btn btn-sm role-link"
              @click="removeLabel(index)"
            >
              Remove
            </button>
          </div>
        </div>
        <button v-if="!isView" type="button" class="btn btn-sm role-tertiary" @click="addLabel">
          Add Label
        </button>
      </div>
    </div>

    <div class="row mb-20">
      <div class="col span-12">
        <h3>Annotations</h3>
        <div
          v-for="(annotation, index) in vmAnnotations"
          :key="`annotation-${index}`"
          class="row mb-10"
        >
          <div class="col span-5">
            <LabeledInput
              v-model:value="annotation.key"
              :mode="mode"
              label="Key"
              placeholder="Enter key"
            />
          </div>
          <div class="col span-5">
            <LabeledInput
              v-model:value="annotation.value"
              :mode="mode"
              label="Value"
              placeholder="Enter value"
            />
          </div>
          <div class="col span-2">
            <button
              v-if="!isView"
              type="button"
              class="btn btn-sm role-link"
              @click="removeAnnotation(index)"
            >
              Remove
            </button>
          </div>
        </div>
        <button
          v-if="!isView"
          type="button"
          class="btn btn-sm role-tertiary"
          @click="addAnnotation"
        >
          Add Annotation
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
h3 {
  margin-bottom: 10px;
}
</style>
