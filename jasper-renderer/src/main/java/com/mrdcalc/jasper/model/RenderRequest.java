package com.mrdcalc.jasper.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public class RenderRequest {

    public String template;
    public Map<String, Object> params;
    public String data;
}
