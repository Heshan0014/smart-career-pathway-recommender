package com.smartcareer.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class AssessmentBehaviorMetricsRequest {

    @JsonProperty("tab_switch_count")
    private Integer tabSwitchCount;

    @JsonProperty("copy_paste_attempts")
    private Integer copyPasteAttempts;

    @JsonProperty("window_blur_count")
    private Integer windowBlurCount;

    @JsonProperty("unusually_fast_count")
    private Integer unusuallyFastCount;

    @JsonProperty("unusually_slow_count")
    private Integer unusuallySlowCount;

    public Integer getTabSwitchCount() {
        return tabSwitchCount;
    }

    public void setTabSwitchCount(Integer tabSwitchCount) {
        this.tabSwitchCount = tabSwitchCount;
    }

    public Integer getCopyPasteAttempts() {
        return copyPasteAttempts;
    }

    public void setCopyPasteAttempts(Integer copyPasteAttempts) {
        this.copyPasteAttempts = copyPasteAttempts;
    }

    public Integer getWindowBlurCount() {
        return windowBlurCount;
    }

    public void setWindowBlurCount(Integer windowBlurCount) {
        this.windowBlurCount = windowBlurCount;
    }

    public Integer getUnusuallyFastCount() {
        return unusuallyFastCount;
    }

    public void setUnusuallyFastCount(Integer unusuallyFastCount) {
        this.unusuallyFastCount = unusuallyFastCount;
    }

    public Integer getUnusuallySlowCount() {
        return unusuallySlowCount;
    }

    public void setUnusuallySlowCount(Integer unusuallySlowCount) {
        this.unusuallySlowCount = unusuallySlowCount;
    }
}
