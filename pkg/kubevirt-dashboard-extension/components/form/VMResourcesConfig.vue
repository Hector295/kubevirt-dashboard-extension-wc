<script>
import { LabeledInput } from '@rancher/components';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import { get, set } from '@shell/utils/object';

export default {
  name: 'VMResourcesConfig',
  components: {
    LabeledInput,
    LabeledSelect,
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
    rules: {
      type: Function,
      default: () => [],
    },
  },

  data() {
    return {
      memoryUnits: [
        { label: 'Mi', value: 'Mi' },
        { label: 'Gi', value: 'Gi' },
        { label: 'Ti', value: 'Ti' },
      ],
    };
  },

  computed: {
    isView() {
      return this.mode === 'view';
    },

    cpuCores: {
      get() {
        return get(this.value, 'spec.template.spec.domain.cpu.cores') || 1;
      },
      set(newValue) {
        set(this.value, 'spec.template.spec.domain.cpu.cores', parseInt(newValue));
      },
    },

    memoryValue: {
      get() {
        const memory = get(this.value, 'spec.template.spec.domain.memory.guest');
        if (!memory) return '';
        return memory.toString().replace(/[A-Za-z]/g, '');
      },
      set(newValue) {
        if (!newValue || newValue === '') {
          const path = 'spec.template.spec.domain.memory.guest';
          const obj = get(this.value, 'spec.template.spec.domain.memory') || {};
          delete obj.guest;
          if (Object.keys(obj).length === 0) {
            set(this.value, 'spec.template.spec.domain.memory', undefined);
          } else {
            set(this.value, 'spec.template.spec.domain.memory', obj);
          }
        } else {
          const unit = this.memoryUnit || 'Gi';
          set(this.value, 'spec.template.spec.domain.memory.guest', `${newValue}${unit}`);
        }
      },
    },

    memoryUnit: {
      get() {
        const memory = get(this.value, 'spec.template.spec.domain.memory.guest');
        if (!memory) return 'Gi';
        return memory.toString().replace(/[0-9]/g, '') || 'Gi';
      },
      set(newValue) {
        const value = this.memoryValue;
        if (value && value !== '') {
          set(this.value, 'spec.template.spec.domain.memory.guest', `${value}${newValue}`);
        }
      },
    },

    // Resource requests
    cpuRequest: {
      get() {
        return get(this.value, 'spec.template.spec.domain.resources.requests.cpu') || '';
      },
      set(newValue) {
        if (newValue) {
          set(this.value, 'spec.template.spec.domain.resources.requests.cpu', newValue);
        } else {
          const resources = get(this.value, 'spec.template.spec.domain.resources.requests') || {};
          delete resources.cpu;
          if (Object.keys(resources).length === 0) {
            const domainResources = get(this.value, 'spec.template.spec.domain.resources') || {};
            delete domainResources.requests;
            set(this.value, 'spec.template.spec.domain.resources', domainResources);
          }
        }
      },
    },

    memoryRequest: {
      get() {
        return get(this.value, 'spec.template.spec.domain.resources.requests.memory') || '';
      },
      set(newValue) {
        if (newValue) {
          set(this.value, 'spec.template.spec.domain.resources.requests.memory', newValue);
        } else {
          const resources = get(this.value, 'spec.template.spec.domain.resources.requests') || {};
          delete resources.memory;
          if (Object.keys(resources).length === 0) {
            const domainResources = get(this.value, 'spec.template.spec.domain.resources') || {};
            delete domainResources.requests;
            set(this.value, 'spec.template.spec.domain.resources', domainResources);
          }
        }
      },
    },

    // Resource limits
    cpuLimit: {
      get() {
        return get(this.value, 'spec.template.spec.domain.resources.limits.cpu') || '';
      },
      set(newValue) {
        if (newValue) {
          set(this.value, 'spec.template.spec.domain.resources.limits.cpu', newValue);
        } else {
          const resources = get(this.value, 'spec.template.spec.domain.resources.limits') || {};
          delete resources.cpu;
          if (Object.keys(resources).length === 0) {
            const domainResources = get(this.value, 'spec.template.spec.domain.resources') || {};
            delete domainResources.limits;
            set(this.value, 'spec.template.spec.domain.resources', domainResources);
          }
        }
      },
    },

    memoryLimit: {
      get() {
        return get(this.value, 'spec.template.spec.domain.resources.limits.memory') || '';
      },
      set(newValue) {
        if (newValue) {
          set(this.value, 'spec.template.spec.domain.resources.limits.memory', newValue);
        } else {
          const resources = get(this.value, 'spec.template.spec.domain.resources.limits') || {};
          delete resources.memory;
          if (Object.keys(resources).length === 0) {
            const domainResources = get(this.value, 'spec.template.spec.domain.resources') || {};
            delete domainResources.limits;
            set(this.value, 'spec.template.spec.domain.resources', domainResources);
          }
        }
      },
    },
  },

  methods: {},
};
</script>

<template>
  <div>
    <div class="row mb-20">
      <div class="col span-12">
        <h3>CPU and Memory Configuration</h3>
        <p class="text-muted">Configure CPU and memory resources for the virtual machine</p>
      </div>
    </div>

    <div class="row mb-20">
      <div class="col span-6">
        <LabeledInput
          v-model:value="cpuCores"
          type="number"
          :mode="mode"
          label="CPU Cores"
          tooltip="Number of virtual CPU cores to allocate to the VM"
          min="1"
          :rules="rules('spec.template.spec.domain.cpu.cores')"
        />
      </div>
      <div class="col span-3">
        <LabeledInput
          v-model:value="memoryValue"
          type="number"
          :mode="mode"
          label="Memory (optional)"
          tooltip="Amount of memory to allocate to the VM"
          placeholder="Leave empty to use cluster defaults"
        />
      </div>
      <div class="col span-3">
        <LabeledSelect
          v-model:value="memoryUnit"
          :mode="mode"
          :options="memoryUnits"
          label="Unit"
          :reduce="(e) => e.value"
        />
      </div>
    </div>

    <div class="row mb-20">
      <div class="col span-12">
        <h3>Resource Requests and Limits (Optional)</h3>
        <p class="text-muted">Configure resource requests and limits for Kubernetes scheduling</p>
      </div>
    </div>

    <div class="row mb-20">
      <div class="col span-12">
        <h4>Resource Requests</h4>
        <p class="text-muted small">Minimum resources that Kubernetes will guarantee</p>
      </div>
    </div>

    <div class="row mb-20">
      <div class="col span-6">
        <LabeledInput
          v-model:value="cpuRequest"
          :mode="mode"
          label="CPU Request"
          placeholder="100m"
          tooltip="CPU request in cores (e.g. 0.5) or millicores (e.g. 500m)"
        />
      </div>
      <div class="col span-6">
        <LabeledInput
          v-model:value="memoryRequest"
          :mode="mode"
          label="Memory Request"
          placeholder="256Mi"
          tooltip="Memory request (e.g. 256Mi, 1Gi)"
        />
      </div>
    </div>

    <div class="row mb-20">
      <div class="col span-12">
        <h4>Resource Limits</h4>
        <p class="text-muted small">Maximum resources that the VM can consume</p>
      </div>
    </div>

    <div class="row mb-20">
      <div class="col span-6">
        <LabeledInput
          v-model:value="cpuLimit"
          :mode="mode"
          label="CPU Limit"
          placeholder="1"
          tooltip="CPU limit in cores (e.g. 1) or millicores (e.g. 1000m)"
        />
      </div>
      <div class="col span-6">
        <LabeledInput
          v-model:value="memoryLimit"
          :mode="mode"
          label="Memory Limit"
          placeholder="1Gi"
          tooltip="Memory limit (e.g. 512Mi, 2Gi)"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
h3,
h4 {
  margin-bottom: 10px;
}

.text-muted {
  color: var(--muted);
  font-size: 0.9em;
  margin-bottom: 15px;

  &.small {
    font-size: 0.8em;
    margin-bottom: 10px;
  }
}
</style>
